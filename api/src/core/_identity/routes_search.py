"""Global user search endpoint."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from .models import User

router = APIRouter()


@router.get(
    "/search",
    dependencies=[Depends(require_permission("search.global"))],
)
async def global_search(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
):
    """Search users by name or email."""
    q_escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    like = f"%{q_escaped}%"
    result = await db.execute(
        select(User)
        .where(
            User.is_active.is_(True),
            or_(
                User.email.ilike(like),
                User.first_name.ilike(like),
                User.last_name.ilike(like),
            ),
        )
        .limit(20)
    )
    users = result.scalars().all()

    return {
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "full_name": f"{u.first_name} {u.last_name}",
            }
            for u in users
        ]
    }
