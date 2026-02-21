"""Rights request endpoints — RGPD rights exercise (access, erasure, portability...)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..security import get_current_user
from .models import RightsRequest
from .schemas import (
    RightsRequestAdminUpdate,
    RightsRequestCreate,
    RightsRequestListResponse,
    RightsRequestResponse,
)

router = APIRouter()

VALID_REQUEST_TYPES = {"access", "rectification", "erasure", "portability", "opposition", "limitation"}
VALID_STATUSES = {"pending", "processing", "completed", "rejected"}


def _to_response(req: RightsRequest, user_email: str | None = None, user_name: str | None = None) -> RightsRequestResponse:
    return RightsRequestResponse(
        id=req.id,
        user_id=req.user_id,
        user_email=user_email,
        user_name=user_name,
        request_type=req.request_type,
        status=req.status,
        description=req.description,
        admin_response=req.admin_response,
        processed_by_id=req.processed_by_id,
        completed_at=req.completed_at,
        created_at=req.created_at,
    )


@router.get("/my", response_model=list[RightsRequestResponse])
async def get_my_rights_requests(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's rights requests."""
    result = await db.execute(
        select(RightsRequest)
        .where(RightsRequest.user_id == current_user.id)
        .order_by(RightsRequest.created_at.desc())
    )
    items = result.scalars().all()
    return [_to_response(r) for r in items]


@router.post("/", response_model=RightsRequestResponse)
async def create_rights_request(
    data: RightsRequestCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new rights request."""
    if data.request_type not in VALID_REQUEST_TYPES:
        raise HTTPException(status_code=400, detail=f"Type de demande invalide: {data.request_type}")

    req = RightsRequest(
        user_id=current_user.id,
        request_type=data.request_type,
        description=data.description,
    )
    db.add(req)
    await db.flush()

    return _to_response(req)


@router.get(
    "/admin",
    response_model=RightsRequestListResponse,
    dependencies=[Depends(require_permission("rgpd.droits.manage"))],
)
async def list_all_rights_requests(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    request_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Admin: paginated list of all rights requests."""
    from .._identity.models import User

    query = select(RightsRequest, User.email, User.first_name, User.last_name).outerjoin(
        User, RightsRequest.user_id == User.id
    )
    count_query = select(func.count(RightsRequest.id))

    if status_filter:
        query = query.where(RightsRequest.status == status_filter)
        count_query = count_query.where(RightsRequest.status == status_filter)

    if request_type:
        query = query.where(RightsRequest.request_type == request_type)
        count_query = count_query.where(RightsRequest.request_type == request_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(RightsRequest.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    rows = result.all()

    items = []
    for req, email, first_name, last_name in rows:
        name = f"{first_name or ''} {last_name or ''}".strip() or None
        items.append(_to_response(req, user_email=email, user_name=name))

    return RightsRequestListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total else 0,
    )


@router.get(
    "/admin/{request_id}",
    response_model=RightsRequestResponse,
    dependencies=[Depends(require_permission("rgpd.droits.manage"))],
)
async def get_rights_request_detail(
    request_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Admin: get a specific rights request detail."""
    from .._identity.models import User

    result = await db.execute(
        select(RightsRequest, User.email, User.first_name, User.last_name)
        .outerjoin(User, RightsRequest.user_id == User.id)
        .where(RightsRequest.id == request_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Demande non trouvee")

    req, email, first_name, last_name = row
    name = f"{first_name or ''} {last_name or ''}".strip() or None
    return _to_response(req, user_email=email, user_name=name)


@router.put(
    "/admin/{request_id}",
    response_model=RightsRequestResponse,
    dependencies=[Depends(require_permission("rgpd.droits.manage"))],
)
async def process_rights_request(
    request_id: int,
    data: RightsRequestAdminUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: process/respond to a rights request."""
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Statut invalide: {data.status}")

    result = await db.execute(
        select(RightsRequest).where(RightsRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Demande non trouvee")

    req.status = data.status
    if data.admin_response is not None:
        req.admin_response = data.admin_response
    req.processed_by_id = current_user.id

    if data.status in ("completed", "rejected"):
        req.completed_at = datetime.now(timezone.utc)

    await db.flush()
    return _to_response(req)
