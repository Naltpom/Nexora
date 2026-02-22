"""Language preference endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes

from ...config import settings
from ...database import get_db
from ...security import get_current_user
from .schemas import LanguageResponse, LanguageUpdateRequest

router = APIRouter()


def _get_supported_locales() -> list[str]:
    return [loc.strip() for loc in settings.I18N_SUPPORTED_LOCALES.split(",") if loc.strip()]


LOCALE_LABELS = {
    "fr": "Francais",
    "en": "English",
    "es": "Espanol",
    "de": "Deutsch",
    "it": "Italiano",
    "pt": "Portugues",
}


@router.get("/language", response_model=LanguageResponse)
async def get_language(
    current_user=Depends(get_current_user),
):
    """Get current user language and available locales."""
    supported = _get_supported_locales()
    return LanguageResponse(
        language=current_user.language,
        available=[
            {"code": loc, "label": LOCALE_LABELS.get(loc, loc), "is_default": loc == settings.I18N_DEFAULT_LOCALE}
            for loc in supported
        ],
    )


@router.put("/language", response_model=LanguageResponse)
async def update_language(
    data: LanguageUpdateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user language preference."""
    supported = _get_supported_locales()
    if data.language not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Langue non supportee. Langues disponibles : {', '.join(supported)}",
        )

    current_user.language = data.language

    # Also persist in preferences JSON
    prefs = current_user.preferences or {}
    prefs["language"] = data.language
    current_user.preferences = prefs
    attributes.flag_modified(current_user, "preferences")

    await db.flush()

    return LanguageResponse(
        language=current_user.language,
        available=[
            {"code": loc, "label": LOCALE_LABELS.get(loc, loc), "is_default": loc == settings.I18N_DEFAULT_LOCALE}
            for loc in supported
        ],
    )
