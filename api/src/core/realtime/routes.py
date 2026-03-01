"""Realtime SSE stream endpoint."""

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse

from ..database import async_session
from ..permissions import load_user_permissions
from ..security import decode_query_token_lightweight
from .services import sse_broadcaster

router = APIRouter()


@router.get("/stream")
async def realtime_stream(
    token_data: dict = Depends(decode_query_token_lightweight),
):
    """Generic SSE stream for all realtime events."""
    user_id = token_data["user_id"]

    # Temporary session for initial checks — released before streaming
    async with async_session() as db:
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

        user_perms = await load_user_permissions(db, user_id)
        if user_perms.get("realtime.stream") is not True:
            raise HTTPException(status_code=403, detail="Permission requise: realtime.stream")

    # Session closed — stream without holding a DB connection
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
