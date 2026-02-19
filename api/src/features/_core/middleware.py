"""Core middleware: impersonation audit logging and last-active tracking."""

from datetime import datetime, timezone

from fastapi import Request
from jose import JWTError, jwt
from sqlalchemy import update
from starlette.middleware.base import BaseHTTPMiddleware

from ...core.config import settings
from ...core.database import async_session
from ...core.security import decode_token
from .models import ImpersonationAction, ImpersonationLog, User


class ImpersonationAuditMiddleware(BaseHTTPMiddleware):
    """Logs all API calls made during impersonation sessions."""

    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = decode_token(token)
                session_id = payload.get("impersonation_session_id")

                if session_id:
                    async with async_session() as db:
                        request_data = {
                            "query_params": dict(request.query_params),
                        }

                        action = ImpersonationAction(
                            session_id=session_id,
                            action_type="api_call",
                            endpoint=str(request.url.path),
                            http_method=request.method,
                            request_data=request_data,
                        )
                        db.add(action)

                        await db.execute(
                            update(ImpersonationLog)
                            .where(ImpersonationLog.session_id == session_id)
                            .values(
                                actions_count=ImpersonationLog.actions_count + 1,
                                last_activity_at=datetime.now(timezone.utc),
                            )
                        )
                        await db.commit()
            except Exception:
                pass  # Invalid token -- just continue

        response = await call_next(request)
        return response


class LastActiveMiddleware(BaseHTTPMiddleware):
    """Updates ``user.last_active`` on authenticated API requests."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Only process successful authenticated requests
        if response.status_code >= 400:
            return response

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return response

        token = auth_header[7:]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            return response

        # Skip refresh tokens and impersonation
        if payload.get("type") != "access" or payload.get("impersonated_by"):
            return response

        user_id_str = payload.get("sub")
        if not user_id_str:
            return response

        user_id = int(user_id_str)

        try:
            async with async_session() as db:
                await db.execute(
                    update(User)
                    .where(User.id == user_id)
                    .values(last_active=datetime.now(timezone.utc))
                )
                await db.commit()
        except Exception:
            pass  # Non-critical

        return response
