"""I18n middleware — resolves locale per request."""

import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from ..config import settings

logger = logging.getLogger(__name__)

_supported: list[str] = []


def _get_supported_locales() -> list[str]:
    global _supported
    if not _supported:
        _supported = [
            loc.strip()
            for loc in settings.I18N_SUPPORTED_LOCALES.split(",")
            if loc.strip()
        ]
    return _supported


def _parse_accept_language(header: str) -> str | None:
    """Extract best matching locale from Accept-Language header.

    Parses quality factors and returns the highest-priority supported locale.
    """
    supported = _get_supported_locales()
    entries: list[tuple[float, str]] = []
    for part in header.split(","):
        pieces = part.strip().split(";")
        tag = pieces[0].strip().lower()
        q = 1.0
        for p in pieces[1:]:
            p = p.strip()
            if p.startswith("q="):
                try:
                    q = float(p[2:])
                except ValueError:
                    pass
        entries.append((q, tag))
    entries.sort(key=lambda x: x[0], reverse=True)
    for _q, tag in entries:
        if tag in supported:
            return tag
        prefix = tag.split("-")[0]
        if prefix in supported:
            return prefix
    return None


class I18nMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        locale = settings.I18N_DEFAULT_LOCALE

        # 1. JWT claim "lang" (set by auth middleware / token)
        token_lang = getattr(request.state, "locale", None)
        if not token_lang:
            # Try extracting from already-decoded JWT if available
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                try:
                    from ..security import decode_token
                    payload = decode_token(auth_header[7:])
                    token_lang = payload.get("lang")
                except Exception:
                    pass

        if token_lang and token_lang in _get_supported_locales():
            locale = token_lang
        else:
            # 2. Accept-Language header
            accept = request.headers.get("accept-language", "")
            if accept:
                parsed = _parse_accept_language(accept)
                if parsed:
                    locale = parsed

        request.state.locale = locale

        response = await call_next(request)
        response.headers["Content-Language"] = locale
        return response
