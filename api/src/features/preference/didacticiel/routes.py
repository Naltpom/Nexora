"""Tutorial seen-state management via user preferences."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ....core.database import get_db
from ....core.security import get_current_user
from ..._core.models import User
from .schemas import TutorialSeenRequest, TutorialSeenResponse

router = APIRouter()


def _parse_prefs(user) -> dict:
    if user.preferences:
        try:
            return json.loads(user.preferences)
        except (json.JSONDecodeError, TypeError):
            pass
    return {}


@router.get("/seen", response_model=TutorialSeenResponse)
async def get_seen_tutorials(current_user=Depends(get_current_user)):
    """Get all seen tutorial IDs with timestamps."""
    prefs = _parse_prefs(current_user)
    return TutorialSeenResponse(tutorials_seen=prefs.get("tutorials_seen", {}))


@router.post("/seen")
async def mark_tutorial_seen(
    request: TutorialSeenRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a tutorial as seen."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    existing = _parse_prefs(user)
    tutorials_seen = existing.get("tutorials_seen", {})
    tutorials_seen[request.tutorial_id] = datetime.now(timezone.utc).isoformat()
    existing["tutorials_seen"] = tutorials_seen
    user.preferences = json.dumps(existing)
    await db.flush()
    return {"ok": True}


@router.delete("/seen")
async def reset_all_tutorials(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reset all tutorial seen states."""
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one()

    existing = _parse_prefs(user)
    existing.pop("tutorials_seen", None)
    user.preferences = json.dumps(existing)
    await db.flush()
    return {"ok": True}
