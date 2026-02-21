"""Admin command management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..command_registry import get_command_registry

router = APIRouter()


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
):
    """Trigger a maintenance command by name."""
    registry = get_command_registry()
    if not registry:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Command registry not available",
        )

    try:
        result = await registry.run_command(command_name, db)
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

    return result
