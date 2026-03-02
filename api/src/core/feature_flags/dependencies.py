"""Feature flag dependency for opt-in flag gating."""

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..security import get_current_user
from .services import evaluate_flag


def require_feature_flag(feature_name: str):
    """FastAPI dependency that checks if a feature flag is enabled for the current user.

    Usage:
        @router.get("/", dependencies=[Depends(require_feature_flag("my_feature"))])
    """

    async def checker(
        current_user=Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        result = await evaluate_flag(db, feature_name, current_user.id)
        if not result["enabled"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature '{feature_name}' is not available for this user",
            )
        return result

    return checker
