"""Admin command management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..command_registry import get_command_registry
from ..database import get_db
from ..events import event_bus
from ..pagination import PaginatedResponse, PaginationParams, paginate
from ..permissions import require_permission
from .models import CommandExecution, CommandState, User
from .routes_auth import get_current_user
from .schemas import CommandExecutionResponse

router = APIRouter()


class CommandToggleRequest(BaseModel):
    enabled: bool


@router.get(
    "/history",
    response_model=PaginatedResponse[CommandExecutionResponse],
    dependencies=[Depends(require_permission("commands.read"))],
)
async def get_command_history(
    pagination: PaginationParams = Depends(PaginationParams(default_per_page=20)),
    command_name: str | None = Query(None),
    command_status: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    """List command execution history with pagination and filters."""
    query = select(CommandExecution).order_by(CommandExecution.executed_at.desc())

    if command_name:
        query = query.where(CommandExecution.command_name == command_name)
    if command_status:
        query = query.where(CommandExecution.status == command_status)

    result, total, pages = await paginate(db, query, pagination)
    logs = result.scalars().all()

    # Batch resolve user names
    user_ids = {log.executed_by for log in logs if log.executed_by}
    user_names: dict[int, str] = {}
    if user_ids:
        user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in user_result.scalars().all():
            user_names[u.id] = f"{u.first_name} {u.last_name}"

    return PaginatedResponse(
        items=[
            CommandExecutionResponse(
                id=log.id,
                command_name=log.command_name,
                command_label=log.command_label,
                feature=log.feature,
                status=log.status,
                result=log.result,
                error_message=log.error_message,
                duration_seconds=log.duration_seconds,
                source=log.source,
                executed_by=log.executed_by,
                executed_by_name=user_names.get(log.executed_by) if log.executed_by else None,
                executed_at=log.executed_at,
            )
            for log in logs
        ],
        total=total,
        page=pagination.page,
        per_page=pagination.per_page,
        pages=pages,
    )


@router.get(
    "",
    dependencies=[Depends(require_permission("commands.read"))],
)
async def list_commands():
    """List all discovered maintenance commands."""
    registry = get_command_registry()
    if not registry:
        return []

    return [
        {
            "name": cmd.name,
            "label": cmd.label,
            "description": cmd.description,
            "feature": cmd.feature,
            "schedule": cmd.schedule,
            "config_keys": cmd.config_keys,
            "enabled": cmd.enabled,
        }
        for cmd in registry.get_all_commands()
    ]


@router.post(
    "/{command_name}/run",
    dependencies=[Depends(require_permission("commands.manage"))],
)
async def run_command(
    command_name: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Trigger a maintenance command by name."""
    registry = get_command_registry()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Command registry not available",
        )

    try:
        result = await registry.run_command(
            command_name, db, executed_by=current_user.id, source="api"
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Command '{command_name}' not found",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    await event_bus.emit(
        "command.executed",
        db=db,
        actor_id=current_user.id,
        resource_type="command",
        resource_id=0,
        payload={"command": command_name, "source": "api", "result": result.get("result")},
    )

    return result


@router.patch(
    "/{command_name}",
    dependencies=[Depends(require_permission("commands.manage"))],
)
async def toggle_command(
    command_name: str,
    body: CommandToggleRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Enable or disable a maintenance command."""
    registry = get_command_registry()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Command registry not available",
        )

    cmd = registry.get_command(command_name)
    if not cmd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Command '{command_name}' not found",
        )

    # Upsert CommandState in DB
    from datetime import datetime, timezone

    existing = await db.execute(
        select(CommandState).where(CommandState.name == command_name)
    )
    state = existing.scalar_one_or_none()
    if state:
        state.enabled = body.enabled
        state.updated_at = datetime.now(timezone.utc)
        state.updated_by = current_user.id
    else:
        state = CommandState(
            name=command_name,
            enabled=body.enabled,
            updated_at=datetime.now(timezone.utc),
            updated_by=current_user.id,
        )
        db.add(state)

    await db.flush()

    await event_bus.emit(
        "command.toggled",
        db=db,
        actor_id=current_user.id,
        resource_type="command",
        resource_id=0,
        payload={"command": command_name, "enabled": body.enabled, "toggled_by": current_user.email},
    )

    await db.commit()

    # Update in-memory state
    registry.set_command_enabled(command_name, body.enabled)

    return {
        "name": cmd.name,
        "label": cmd.label,
        "description": cmd.description,
        "feature": cmd.feature,
        "schedule": cmd.schedule,
        "config_keys": cmd.config_keys,
        "enabled": cmd.enabled,
    }
