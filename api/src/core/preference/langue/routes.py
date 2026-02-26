"""Language preference endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes

from ...config import settings
from ...database import get_db
from ...events import event_bus
from ...i18n.locale_labels import LOCALE_LABELS
from ...permissions import require_permission
from ...security import create_access_token, get_current_user
from .schemas import LanguageResponse, LanguageUpdateRequest

router = APIRouter()


def _get_supported_locales() -> list[str]:
    return [loc.strip() for loc in settings.I18N_SUPPORTED_LOCALES.split(",") if loc.strip()]


@router.get(
    "/language",
    response_model=LanguageResponse,
    dependencies=[Depends(require_permission("preference.langue.read"))],
)
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


@router.put(
    "/language",
    response_model=LanguageResponse,
    dependencies=[Depends(require_permission("preference.langue.read"))],
)
async def update_language(
    data: LanguageUpdateRequest,
    request: Request,
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

    old_language = current_user.language
    current_user.language = data.language

    # Also persist in preferences JSON
    prefs = current_user.preferences or {}
    prefs["language"] = data.language
    current_user.preferences = prefs
    attributes.flag_modified(current_user, "preferences")

    await db.flush()

    # Emit preference.updated event
    await event_bus.emit(
        "preference.updated",
        db=db,
        actor_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
        payload={
            "keys": ["language"],
            "old_language": old_language,
            "new_language": data.language,
            "ip": request.client.host if request.client else None,
        },
    )

    # Generate new access token with updated lang claim
    token_data = {"sub": str(current_user.id), "email": current_user.email, "lang": data.language}
    new_access_token = create_access_token(token_data)

    return LanguageResponse(
        language=current_user.language,
        available=[
            {"code": loc, "label": LOCALE_LABELS.get(loc, loc), "is_default": loc == settings.I18N_DEFAULT_LOCALE}
            for loc in supported
        ],
        access_token=new_access_token,
    )
