"""Impersonation management endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..security import (
    create_access_token,
    create_impersonation_token,
    create_refresh_token,
    get_current_user,
    get_original_admin_id,
    is_impersonating,
)
from .models import ImpersonationLog, User
from .schemas import (
    ImpersonationLogResponse,
    ImpersonationStartResponse,
    ImpersonationStatusResponse,
    ImpersonationStopResponse,
    UserSearchResult,
)

router = APIRouter()


# ---------------------------------------------------------------------------
#  Start impersonation
# ---------------------------------------------------------------------------


@router.post(
    "/start/{target_user_id}",
    response_model=ImpersonationStartResponse,
    dependencies=[Depends(require_permission("impersonation.start"))],
)
async def start_impersonation(
    target_user_id: int,
    request: Request,
    current_admin=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if is_impersonating(current_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impossible de s'impersonifier pendant une impersonation active",
        )

    if target_user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de s'impersonifier soi-meme",
        )

    result = await db.execute(select(User).where(User.id == target_user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur cible introuvable")
    if not target.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'impersonifier un utilisateur inactif",
        )
    if target.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impossible d'impersonifier un autre super administrateur",
        )

    session_id = str(uuid.uuid4())
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    log = ImpersonationLog(
        session_id=session_id,
        admin_user_id=current_admin.id,
        target_user_id=target.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)
    await db.flush()

    access_token = create_impersonation_token(
        target_user_id=target.id,
        target_email=target.email,
        admin_user_id=current_admin.id,
        session_id=session_id,
        lang=target.language,
    )
    refresh_token = create_refresh_token({
        "sub": str(target.id),
        "email": target.email,
        "lang": target.language,
        "impersonated_by": current_admin.id,
        "impersonation_session_id": session_id,
    })

    await event_bus.emit(
        "admin.impersonation_started",
        db=db,
        actor_id=current_admin.id,
        resource_type="user",
        resource_id=target.id,
        payload={
            "actor_name": f"{current_admin.first_name} {current_admin.last_name}",
            "target_name": f"{target.first_name} {target.last_name}",
            "target_email": target.email,
            "session_id": session_id,
        },
    )

    return ImpersonationStartResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        impersonated_user_id=target.id,
        impersonated_user_email=target.email,
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
#  Stop impersonation
# ---------------------------------------------------------------------------


@router.post("/stop", response_model=ImpersonationStopResponse)
async def stop_impersonation(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_impersonating(current_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune session d'impersonation active",
        )

    admin_user_id = get_original_admin_id(current_user)
    session_id = current_user._impersonation_session_id

    # End session
    result = await db.execute(
        select(ImpersonationLog).where(ImpersonationLog.session_id == session_id)
    )
    session = result.scalar_one_or_none()
    if session:
        session.ended_at = datetime.now(timezone.utc)
        await db.flush()

    # Get admin user
    result = await db.execute(select(User).where(User.id == admin_user_id))
    admin = result.scalar_one_or_none()
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur administrateur introuvable",
        )

    token_data = {"sub": str(admin.id), "email": admin.email, "lang": admin.language}
    return ImpersonationStopResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        message="Impersonation terminee avec succes",
    )


# ---------------------------------------------------------------------------
#  Switch impersonation
# ---------------------------------------------------------------------------


@router.post("/switch/{target_user_id}", response_model=ImpersonationStartResponse)
async def switch_impersonation(
    target_user_id: int,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_impersonating(current_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune session d'impersonation active",
        )

    admin_user_id = get_original_admin_id(current_user)
    old_session_id = current_user._impersonation_session_id

    # Stop the current session
    result = await db.execute(
        select(ImpersonationLog).where(ImpersonationLog.session_id == old_session_id)
    )
    old_session = result.scalar_one_or_none()
    if old_session:
        old_session.ended_at = datetime.now(timezone.utc)

    # Validate target
    if target_user_id == admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de s'impersonifier soi-meme",
        )

    result = await db.execute(select(User).where(User.id == target_user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur cible introuvable")
    if not target.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'impersonifier un utilisateur inactif",
        )
    if target.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Impossible d'impersonifier un autre super administrateur",
        )

    # Start new session
    session_id = str(uuid.uuid4())
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    log = ImpersonationLog(
        session_id=session_id,
        admin_user_id=admin_user_id,
        target_user_id=target.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)
    await db.flush()

    access_token = create_impersonation_token(
        target_user_id=target.id,
        target_email=target.email,
        admin_user_id=admin_user_id,
        session_id=session_id,
        lang=target.language,
    )
    refresh_token = create_refresh_token({
        "sub": str(target.id),
        "email": target.email,
        "lang": target.language,
        "impersonated_by": admin_user_id,
        "impersonation_session_id": session_id,
    })

    return ImpersonationStartResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        impersonated_user_id=target.id,
        impersonated_user_email=target.email,
        session_id=session_id,
    )


# ---------------------------------------------------------------------------
#  Status
# ---------------------------------------------------------------------------


@router.get("/status", response_model=ImpersonationStatusResponse)
async def get_impersonation_status(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not is_impersonating(current_user):
        return ImpersonationStatusResponse(is_impersonating=False)

    session_id = current_user._impersonation_session_id
    result = await db.execute(
        select(ImpersonationLog).where(ImpersonationLog.session_id == session_id)
    )
    session = result.scalar_one_or_none()

    return ImpersonationStatusResponse(
        is_impersonating=True,
        target_user_id=current_user.id,
        target_user_name=f"{current_user.first_name} {current_user.last_name}",
        original_admin_id=get_original_admin_id(current_user),
        session_id=session_id,
        started_at=session.started_at if session else None,
    )


# ---------------------------------------------------------------------------
#  Search users for impersonation
# ---------------------------------------------------------------------------


@router.get(
    "/search-users",
    response_model=list[UserSearchResult],
    dependencies=[Depends(require_permission("impersonation.read"))],
)
async def search_users_for_impersonation(
    q: str = Query(..., min_length=2, description="Search query"),
    current_admin=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    like = f"%{q}%"
    result = await db.execute(
        select(User)
        .where(
            User.id != current_admin.id,
            User.is_active.is_(True),
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            ),
        )
        .limit(20)
    )
    users = result.scalars().all()

    return [
        UserSearchResult(
            id=u.id,
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            full_name=f"{u.first_name} {u.last_name}",
            is_active=u.is_active,
        )
        for u in users
    ]


# ---------------------------------------------------------------------------
#  Logs
# ---------------------------------------------------------------------------


@router.get(
    "/logs",
    response_model=list[ImpersonationLogResponse],
    dependencies=[Depends(require_permission("impersonation.read"))],
)
async def get_impersonation_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_admin=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    result = await db.execute(
        select(ImpersonationLog)
        .order_by(ImpersonationLog.started_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    logs = result.scalars().all()

    # Resolve user names
    user_ids: set[int] = set()
    for log in logs:
        user_ids.add(log.admin_user_id)
        user_ids.add(log.target_user_id)

    user_names: dict[int, str] = {}
    if user_ids:
        result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in result.scalars().all():
            user_names[u.id] = f"{u.first_name} {u.last_name}"

    response = []
    for log in logs:
        duration_minutes = None
        if log.ended_at and log.started_at:
            duration_minutes = int((log.ended_at - log.started_at).total_seconds() / 60)

        response.append(
            ImpersonationLogResponse(
                id=log.id,
                session_id=log.session_id,
                admin_user_id=log.admin_user_id,
                admin_user_name=user_names.get(log.admin_user_id, str(log.admin_user_id)),
                target_user_id=log.target_user_id,
                target_user_name=user_names.get(log.target_user_id, str(log.target_user_id)),
                started_at=log.started_at,
                ended_at=log.ended_at,
                actions_count=log.actions_count,
                duration_minutes=duration_minutes,
            )
        )

    return response
