"""Legal pages endpoints — privacy policy, terms, legal notices, acceptance."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..security import get_current_user
from .models import LegalPage, LegalPageAcceptance, LegalPageVersion
from .schemas import (
    CheckPendingResponse,
    LegalAcceptanceInput,
    LegalPageListResponse,
    LegalPageResponse,
    LegalPageUpdate,
    LegalPageVersionResponse,
    PendingLegalAcceptance,
)

router = APIRouter()

VALID_SLUGS = {"privacy-policy", "terms", "legal-notice", "cookie-policy"}


def _to_response(page: LegalPage) -> LegalPageResponse:
    return LegalPageResponse(
        id=page.id,
        slug=page.slug,
        title=page.title,
        content_html=page.content_html,
        is_published=page.is_published,
        requires_acceptance=page.requires_acceptance,
        version=page.version,
        updated_at=page.updated_at,
    )


# ---------------------------------------------------------------------------
#  Public
# ---------------------------------------------------------------------------


@router.get("/{slug}", response_model=LegalPageResponse)
async def get_legal_page(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Public: get a published legal page by slug. No auth required."""
    result = await db.execute(
        select(LegalPage).where(LegalPage.slug == slug, LegalPage.is_published.is_(True))
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvee")
    return _to_response(page)


# ---------------------------------------------------------------------------
#  User — Legal acceptance
# ---------------------------------------------------------------------------


async def get_pending_acceptances_for_user(
    db: AsyncSession, user_id: int, user_created_at: datetime | None = None,
) -> tuple[list[PendingLegalAcceptance], bool]:
    """Return (pending_pages, has_previous_acceptances) for a user.

    has_previous_acceptances is True when the user has accepted any legal page
    before OR the account is older than 5 minutes (existing user, not a fresh
    registration).
    """
    stmt = (
        select(LegalPage)
        .where(
            LegalPage.requires_acceptance.is_(True),
            LegalPage.is_published.is_(True),
            ~exists(
                select(LegalPageAcceptance.id).where(
                    LegalPageAcceptance.legal_page_id == LegalPage.id,
                    LegalPageAcceptance.user_id == user_id,
                    LegalPageAcceptance.version_accepted == LegalPage.version,
                )
            ),
        )
        .order_by(LegalPage.slug)
    )
    result = await db.execute(stmt)
    pages = result.scalars().all()

    # Existing user: has prior acceptance records OR account is not brand-new
    has_prev_result = await db.execute(
        select(LegalPageAcceptance.id)
        .where(LegalPageAcceptance.user_id == user_id)
        .limit(1)
    )
    has_acceptance_records = has_prev_result.scalar_one_or_none() is not None

    account_is_old = False
    if user_created_at:
        account_is_old = (datetime.now(timezone.utc) - user_created_at) > timedelta(minutes=5)

    has_previous = has_acceptance_records or account_is_old

    pending = [
        PendingLegalAcceptance(
            slug=p.slug,
            title=p.title,
            version=p.version,
            updated_at=p.updated_at,
            content_html=p.content_html,
        )
        for p in pages
    ]
    return pending, has_previous


@router.get(
    "/acceptance/pending",
    response_model=list[PendingLegalAcceptance],
    dependencies=[Depends(require_permission("rgpd.politique.read"))],
)
async def get_pending_acceptances(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: get legal pages requiring acceptance."""
    pending, _ = await get_pending_acceptances_for_user(db, current_user.id)
    return pending


@router.get(
    "/acceptance/check",
    response_model=CheckPendingResponse,
    dependencies=[Depends(require_permission("rgpd.politique.read"))],
)
async def check_pending_acceptances(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: lightweight check — are there pending legal acceptances?"""
    stmt = (
        select(LegalPage.id)
        .where(
            LegalPage.requires_acceptance.is_(True),
            LegalPage.is_published.is_(True),
            ~exists(
                select(LegalPageAcceptance.id).where(
                    LegalPageAcceptance.legal_page_id == LegalPage.id,
                    LegalPageAcceptance.user_id == current_user.id,
                    LegalPageAcceptance.version_accepted == LegalPage.version,
                )
            ),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    return CheckPendingResponse(pending=result.scalar_one_or_none() is not None)


@router.post(
    "/acceptance/accept",
    dependencies=[Depends(require_permission("rgpd.politique.read"))],
)
async def accept_legal_pages(
    data: LegalAcceptanceInput,
    request: Request,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User: record acceptance of legal pages (current version)."""
    if not data.slugs:
        raise HTTPException(status_code=400, detail="Aucun document specifie")

    result = await db.execute(
        select(LegalPage).where(
            LegalPage.slug.in_(data.slugs),
            LegalPage.requires_acceptance.is_(True),
            LegalPage.is_published.is_(True),
        )
    )
    pages = result.scalars().all()

    if len(pages) != len(data.slugs):
        raise HTTPException(status_code=400, detail="Un ou plusieurs documents introuvables")

    ip = request.client.host if request.client else None
    ua = (request.headers.get("user-agent") or "")[:500]
    now = datetime.now(timezone.utc)

    for page in pages:
        acceptance = LegalPageAcceptance(
            user_id=current_user.id,
            legal_page_id=page.id,
            version_accepted=page.version,
            ip_address=ip,
            user_agent=ua,
            accepted_at=now,
        )
        db.add(acceptance)

    await db.flush()

    await event_bus.emit(
        "rgpd.politique.accepted",
        db=db,
        actor_id=current_user.id,
        details={"slugs": data.slugs, "count": len(pages)},
    )

    return {"message": "Documents acceptes", "count": len(pages)}


# ---------------------------------------------------------------------------
#  Admin
# ---------------------------------------------------------------------------


@router.get(
    "/",
    response_model=LegalPageListResponse,
    dependencies=[Depends(require_permission("rgpd.politique.update"))],
)
async def list_legal_pages(db: AsyncSession = Depends(get_db)):
    """Admin: list all legal pages (published and drafts)."""
    result = await db.execute(select(LegalPage).order_by(LegalPage.slug))
    items = result.scalars().all()

    existing_slugs = {p.slug for p in items}
    responses = [_to_response(p) for p in items]

    for slug in VALID_SLUGS - existing_slugs:
        responses.append(LegalPageResponse(
            id=0,
            slug=slug,
            title=slug.replace("-", " ").title(),
            content_html="",
            is_published=False,
            requires_acceptance=False,
            version=0,
            updated_at=datetime.now(timezone.utc),
        ))

    responses.sort(key=lambda p: p.slug)
    return LegalPageListResponse(items=responses)


@router.put(
    "/{slug}",
    response_model=LegalPageResponse,
    dependencies=[Depends(require_permission("rgpd.politique.update"))],
)
async def upsert_legal_page(
    slug: str,
    data: LegalPageUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: create or update a legal page."""
    if slug not in VALID_SLUGS:
        raise HTTPException(status_code=400, detail=f"Slug invalide: {slug}")

    result = await db.execute(select(LegalPage).where(LegalPage.slug == slug))
    page = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if page:
        # Archive current version before updating
        version_snapshot = LegalPageVersion(
            legal_page_id=page.id,
            version=page.version,
            title=page.title,
            content_html=page.content_html,
            created_by_id=page.updated_by_id,
            created_at=page.updated_at,
        )
        db.add(version_snapshot)

        page.title = data.title
        page.content_html = data.content_html
        page.is_published = data.is_published
        page.requires_acceptance = data.requires_acceptance
        page.version = page.version + 1
        page.updated_by_id = current_user.id
        page.updated_at = now
    else:
        page = LegalPage(
            slug=slug,
            title=data.title,
            content_html=data.content_html,
            is_published=data.is_published,
            requires_acceptance=data.requires_acceptance,
            version=1,
            updated_by_id=current_user.id,
            created_at=now,
            updated_at=now,
        )
        db.add(page)

    await db.flush()

    await event_bus.emit(
        "rgpd.politique.updated",
        db=db,
        actor_id=current_user.id,
        details={"slug": slug, "version": page.version},
    )

    return _to_response(page)


@router.get(
    "/{slug}/versions",
    response_model=list[LegalPageVersionResponse],
    dependencies=[Depends(require_permission("rgpd.politique.update"))],
)
async def get_legal_page_versions(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Admin: get version history for a legal page."""
    result = await db.execute(select(LegalPage).where(LegalPage.slug == slug))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page non trouvee")

    result = await db.execute(
        select(LegalPageVersion)
        .where(LegalPageVersion.legal_page_id == page.id)
        .order_by(LegalPageVersion.version.desc())
    )
    versions = result.scalars().all()
    return [
        LegalPageVersionResponse(
            version=v.version,
            title=v.title,
            content_html=v.content_html,
            created_at=v.created_at,
        )
        for v in versions
    ]
