"""Legal pages endpoints — privacy policy, terms, legal notices."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..security import get_current_user
from .models import LegalPage
from .schemas import LegalPageListResponse, LegalPageResponse, LegalPageUpdate

router = APIRouter()

VALID_SLUGS = {"privacy-policy", "terms", "legal-notice", "cookie-policy"}


def _to_response(page: LegalPage) -> LegalPageResponse:
    return LegalPageResponse(
        id=page.id,
        slug=page.slug,
        title=page.title,
        content_html=page.content_html,
        is_published=page.is_published,
        version=page.version,
        updated_at=page.updated_at,
    )


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


@router.get(
    "/",
    response_model=LegalPageListResponse,
    dependencies=[Depends(require_permission("rgpd.politique.manage"))],
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
            version=0,
            updated_at=datetime.now(timezone.utc),
        ))

    responses.sort(key=lambda p: p.slug)
    return LegalPageListResponse(items=responses)


@router.put(
    "/{slug}",
    response_model=LegalPageResponse,
    dependencies=[Depends(require_permission("rgpd.politique.manage"))],
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
        page.title = data.title
        page.content_html = data.content_html
        page.is_published = data.is_published
        page.version = page.version + 1
        page.updated_by_id = current_user.id
        page.updated_at = now
    else:
        page = LegalPage(
            slug=slug,
            title=data.title,
            content_html=data.content_html,
            is_published=data.is_published,
            version=1,
            updated_by_id=current_user.id,
            created_at=now,
            updated_at=now,
        )
        db.add(page)

    await db.flush()
    return _to_response(page)
