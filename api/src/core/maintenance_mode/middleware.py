"""Maintenance mode middleware — returns 503 for non-bypass users when maintenance is active."""

import logging

import jwt
from jwt.exceptions import PyJWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import JSONResponse

from ..config import settings
from ..database import async_session
from ..feature_registry import get_registry

logger = logging.getLogger(__name__)

# Paths exempt from maintenance blocking
_EXEMPT_PATHS = (
    "/api/maintenance/status",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/register",
    "/api/health",
    "/api/settings/public",
    "/api/sso/callback",
    "/api/mfa/verify",
    "/api/docs",
    "/api/openapi.json",
)


class MaintenanceMiddleware(BaseHTTPMiddleware):
    """Block non-bypass users with 503 when maintenance mode is active."""

    async def dispatch(self, request: StarletteRequest, call_next):
        # Check if feature is active in registry
        registry = get_registry()
        if not registry or not registry.is_active("maintenance_mode"):
            return await call_next(request)

        # Only intercept /api/ paths
        path = request.url.path
        if not path.startswith("/api/"):
            return await call_next(request)

        # Check exempt paths
        for exempt in _EXEMPT_PATHS:
            if path == exempt or path.startswith(exempt + "/"):
                return await call_next(request)

        # Check cache
        from .services import get_cached_state, refresh_cache_from_db

        state = get_cached_state()
        if state is None:
            async with async_session() as db:
                state = await refresh_cache_from_db(db)

        if state is None or not state.is_active:
            return await call_next(request)

        # Maintenance is active — check if user has bypass role
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                user_id_str = payload.get("sub")
                if user_id_str and payload.get("type") == "access":
                    user_id = int(user_id_str)
                    async with async_session() as db:
                        from .services import user_has_bypass_role
                        if await user_has_bypass_role(db, user_id, state.bypass_roles):
                            return await call_next(request)
            except (PyJWTError, ValueError, TypeError):
                pass  # Invalid token — user gets 503

        # Return 503
        return JSONResponse(
            status_code=503,
            content={
                "detail": "maintenance_mode",
                "message": state.message,
                "scheduled_end": state.scheduled_end.isoformat() if state.scheduled_end else None,
            },
        )
