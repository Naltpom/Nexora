"""Realtime SSE stream endpoint."""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from ..database import get_db
from ..permissions import load_user_permissions
from ..security import decode_query_token_lightweight
from .services import sse_broadcaster

router = APIRouter()


@router.get("/stream")
async def realtime_stream(
    token_data: dict = Depends(decode_query_token_lightweight),
    db: AsyncSession = Depends(get_db),
):
    """Generic SSE stream for all realtime events."""
    user_id = token_data["user_id"]

    # One-time check: user still active?
    from .._identity.models import User

    result = await db.execute(
        select(User.id).where(
            User.id == user_id,
            User.is_active == True,  # noqa: E712
            User.deleted_at.is_(None),
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=401, detail="Utilisateur inactif")

    # Permission check (can't use require_permission dependency — SSE uses query token, not Bearer)
    user_perms = await load_user_permissions(db, user_id)
    if user_perms.get("realtime.stream") is not True:
        raise HTTPException(status_code=403, detail="Permission requise: realtime.stream")

    async def event_generator():
        queue = await sse_broadcaster.subscribe(user_id)
        try:
            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield {
                        "event": data.get("type", "message"),
                        "data": json.dumps(data.get("data", {})),
                    }
                except asyncio.TimeoutError:
                    yield {"event": "heartbeat", "data": ""}
        except asyncio.CancelledError:
            pass
        finally:
            await sse_broadcaster.unsubscribe(user_id, queue)

    return EventSourceResponse(event_generator())
