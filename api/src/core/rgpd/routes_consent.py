"""Consent management endpoints — cookie consent tracking."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..security import get_current_user
from .models import ConsentRecord
from .schemas import (
    ConsentBulkInput,
    ConsentListResponse,
    ConsentResponse,
    UserConsentSummary,
)

router = APIRouter()

VALID_CONSENT_TYPES = {"necessary", "functional", "analytics", "marketing"}


@router.get("/my", response_model=UserConsentSummary)
async def get_my_consents(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's latest consent for each type."""
    summary = {"necessary": True, "functional": False, "analytics": False, "marketing": False}
    latest_at = None

    for ctype in VALID_CONSENT_TYPES:
        result = await db.execute(
            select(ConsentRecord)
            .where(
                ConsentRecord.user_id == current_user.id,
                ConsentRecord.consent_type == ctype,
            )
            .order_by(ConsentRecord.created_at.desc())
            .limit(1)
        )
        record = result.scalar_one_or_none()
        if record:
            summary[ctype] = record.granted
            if latest_at is None or record.created_at > latest_at:
                latest_at = record.created_at

    return UserConsentSummary(**summary, updated_at=latest_at)


@router.post("/", response_model=list[ConsentResponse])
async def record_consent(
    data: ConsentBulkInput,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Record consent choices. Works for anonymous visitors and authenticated users."""
    user_id = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from ..security import decode_token
            from .._identity.models import User

            payload = decode_token(auth_header[7:])
            if payload.get("type") == "access" and payload.get("sub"):
                result = await db.execute(select(User).where(User.id == int(payload["sub"])))
                user = result.scalar_one_or_none()
                if user and user.is_active and user.deleted_at is None:
                    user_id = user.id
        except Exception:
            pass

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")[:500]
    now = datetime.now(timezone.utc)
    records = []

    for consent in data.consents:
        if consent.consent_type not in VALID_CONSENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Type de consentement invalide: {consent.consent_type}")

        record = ConsentRecord(
            user_id=user_id,
            consent_type=consent.consent_type,
            granted=consent.granted if consent.consent_type != "necessary" else True,
            ip_address=ip,
            user_agent=ua,
            created_at=now,
        )
        db.add(record)
        records.append(record)

    await db.flush()

    return [
        ConsentResponse(
            id=r.id,
            user_id=r.user_id,
            consent_type=r.consent_type,
            granted=r.granted,
            ip_address=r.ip_address,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.put("/", response_model=list[ConsentResponse])
async def update_my_consents(
    data: ConsentBulkInput,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update authenticated user's consent preferences."""
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")[:500]
    now = datetime.now(timezone.utc)
    records = []

    for consent in data.consents:
        if consent.consent_type not in VALID_CONSENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Type de consentement invalide: {consent.consent_type}")

        record = ConsentRecord(
            user_id=current_user.id,
            consent_type=consent.consent_type,
            granted=consent.granted if consent.consent_type != "necessary" else True,
            ip_address=ip,
            user_agent=ua,
            created_at=now,
        )
        db.add(record)
        records.append(record)

    await db.flush()

    return [
        ConsentResponse(
            id=r.id,
            user_id=r.user_id,
            consent_type=r.consent_type,
            granted=r.granted,
            ip_address=r.ip_address,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get(
    "/admin",
    response_model=ConsentListResponse,
    dependencies=[Depends(require_permission("rgpd.consentement.manage"))],
)
async def list_all_consents(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    consent_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Admin: paginated list of all consent records."""
    query = select(ConsentRecord)
    count_query = select(func.count(ConsentRecord.id))

    if consent_type:
        query = query.where(ConsentRecord.consent_type == consent_type)
        count_query = count_query.where(ConsentRecord.consent_type == consent_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ConsentRecord.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    items = result.scalars().all()

    return ConsentListResponse(
        items=[
            ConsentResponse(
                id=r.id,
                user_id=r.user_id,
                consent_type=r.consent_type,
                granted=r.granted,
                ip_address=r.ip_address,
                created_at=r.created_at,
            )
            for r in items
        ],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page if total else 0,
    )
