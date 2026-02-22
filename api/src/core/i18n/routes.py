"""i18n public endpoints."""

from fastapi import APIRouter, Query

from ..config import settings
from .schemas import LocaleInfo, TranslationsResponse
from .translations import get_all_namespaces, get_translations

router = APIRouter()

LOCALE_LABELS = {
    "fr": "Francais",
    "en": "English",
    "es": "Espanol",
    "de": "Deutsch",
    "it": "Italiano",
    "pt": "Portugues",
}


@router.get("/locales", response_model=list[LocaleInfo])
async def list_locales():
    """Return available locales."""
    supported = [
        loc.strip()
        for loc in settings.I18N_SUPPORTED_LOCALES.split(",")
        if loc.strip()
    ]
    return [
        LocaleInfo(
            code=loc,
            label=LOCALE_LABELS.get(loc, loc),
            is_default=(loc == settings.I18N_DEFAULT_LOCALE),
        )
        for loc in supported
    ]


@router.get("/translations", response_model=TranslationsResponse)
async def get_translations_endpoint(
    locale: str = Query(default="fr", description="Locale code"),
    namespace: str = Query(default="common", description="Translation namespace"),
):
    """Return translations for a given locale and namespace."""
    translations = get_translations(locale, namespace)
    return TranslationsResponse(
        locale=locale,
        namespace=namespace,
        translations=translations,
    )


@router.get("/namespaces", response_model=list[str])
async def list_namespaces(
    locale: str = Query(default="fr", description="Locale code"),
):
    """Return available namespaces for a locale."""
    return get_all_namespaces(locale)
