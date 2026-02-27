"""RGPD audit log endpoints — who accessed what personal data."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from ..database import get_db
from ..permissions import require_permission
from .models import DataAccessLog
from .schemas import AuditLogListResponse, DataAccessLogResponse

router = APIRouter()


@router.get(
    "/",
    response_model=AuditLogListResponse,
    dependencies=[Depends(require_permission("rgpd.audit.read"))],
)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    action: str | None = Query(None),
    resource_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Admin: paginated list of data access audit logs."""
    from .._identity.models import User

    AccessorUser = aliased(User, name="accessor_user")
    TargetUser = aliased(User, name="target_user")

    query = (
        select(
            DataAccessLog,
            AccessorUser.email.label("accessor_email"),
            TargetUser.email.label("target_user_email"),
        )
        .outerjoin(AccessorUser, DataAccessLog.accessor_id == AccessorUser.id)
        .outerjoin(TargetUser, DataAccessLog.target_user_id == TargetUser.id)
    )
    count_query = select(func.count(DataAccessLog.id))

    if action:
        query = query.where(DataAccessLog.action == action)
        count_query = count_query.where(DataAccessLog.action == action)

    if resource_type:
        query = query.where(DataAccessLog.resource_type == resource_type)
        count_query = count_query.where(DataAccessLog.resource_type == resource_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(DataAccessLog.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for log, accessor_email, target_user_email in rows:
        items.append(DataAccessLogResponse(
            id=log.id,
            accessor_id=log.accessor_id,
            accessor_email=accessor_email,
            target_user_id=log.target_user_id,
            target_user_email=target_user_email,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            action=log.action,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
        ))

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total else 0,
    )


@router.get(
    "/user/{user_id}",
    response_model=AuditLogListResponse,
    dependencies=[Depends(require_permission("rgpd.audit.read"))],
)
async def list_audit_logs_for_user(
    user_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Admin: audit logs for a specific user's data."""
    from .._identity.models import User

    AccessorUser = aliased(User, name="accessor_user")
    TargetUser = aliased(User, name="target_user")

    query = (
        select(
            DataAccessLog,
            AccessorUser.email.label("accessor_email"),
            TargetUser.email.label("target_user_email"),
        )
        .outerjoin(AccessorUser, DataAccessLog.accessor_id == AccessorUser.id)
        .outerjoin(TargetUser, DataAccessLog.target_user_id == TargetUser.id)
        .where(DataAccessLog.target_user_id == user_id)
    )
    count_query = select(func.count(DataAccessLog.id)).where(
        DataAccessLog.target_user_id == user_id
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(DataAccessLog.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for log, accessor_email, target_user_email in rows:
        items.append(DataAccessLogResponse(
            id=log.id,
            accessor_id=log.accessor_id,
            accessor_email=accessor_email,
            target_user_id=log.target_user_id,
            target_user_email=target_user_email,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            action=log.action,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
        ))

    return AuditLogListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total else 0,
    )
