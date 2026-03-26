"""Feature flags routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .._identity.models import FeatureState
from ..database import get_db
from ..events import event_bus
from ..permissions import require_permission
from ..security import get_current_user
from .models import FeatureFlag
from .schemas import (
    FeatureFlagCreate,
    FeatureFlagResponse,
    FeatureFlagUpdate,
    FlagEvaluationRequest,
    FlagEvaluationResponse,
)
from .services import evaluate_flag, get_flag, list_flags

router = APIRouter()


@router.get(
    "/",
    response_model=list[FeatureFlagResponse],
    dependencies=[Depends(require_permission("feature_flags.read"))],
)
async def list_all(db: AsyncSession = Depends(get_db)):
    """List all feature flags."""
    flags = await list_flags(db)
    return [FeatureFlagResponse(**f) for f in flags]


@router.get(
    "/{feature_name}",
    response_model=FeatureFlagResponse,
    dependencies=[Depends(require_permission("feature_flags.read"))],
)
async def get_one(feature_name: str, db: AsyncSession = Depends(get_db)):
    """Get a single feature flag by feature_name."""
    flag = await get_flag(db, feature_name)
    if not flag:
        raise HTTPException(status_code=404, detail="Flag introuvable")
    return FeatureFlagResponse(**flag)


@router.post(
    "/",
    response_model=FeatureFlagResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("feature_flags.create"))],
)
async def create(
    data: FeatureFlagCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a feature flag rule."""
    # Check feature exists
    result = await db.execute(
        select(FeatureState).where(FeatureState.name == data.feature_name)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Feature '{data.feature_name}' introuvable")

    # Check no duplicate
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.feature_name == data.feature_name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Un flag existe deja pour '{data.feature_name}'")

    flag = FeatureFlag(
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
        **data.model_dump(),
    )
    db.add(flag)
    await db.flush()

    await event_bus.emit(
        "feature_flags.rule_created",
        db=db,
        actor_id=current_user.id,
        resource_type="feature_flag",
        resource_id=flag.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "feature_name": flag.feature_name,
            "strategy": flag.strategy,
        },
    )

    flag_data = await get_flag(db, flag.feature_name)
    return FeatureFlagResponse(**flag_data)


@router.put(
    "/{feature_name}",
    response_model=FeatureFlagResponse,
    dependencies=[Depends(require_permission("feature_flags.update"))],
)
async def update(
    feature_name: str,
    data: FeatureFlagUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a feature flag rule."""
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.feature_name == feature_name)
    )
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag introuvable")

    provided = data.model_dump(exclude_unset=True)

    # Validate variants if strategy is being changed to ab_test or already is
    new_strategy = provided.get("strategy", flag.strategy)
    new_variants = provided.get("variants", flag.variants)
    if new_strategy == "ab_test" and new_variants:
        if len(new_variants) < 2:
            raise HTTPException(status_code=400, detail="A/B test requires at least 2 variants")
        total = sum(v.get("weight", 0) for v in new_variants)
        if total != 100:
            raise HTTPException(status_code=400, detail=f"Variant weights must sum to 100, got {total}")

    for field, value in provided.items():
        setattr(flag, field, value)
    flag.updated_by_id = current_user.id
    await db.flush()

    await event_bus.emit(
        "feature_flags.rule_updated",
        db=db,
        actor_id=current_user.id,
        resource_type="feature_flag",
        resource_id=flag.id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "feature_name": flag.feature_name,
            "fields": list(provided.keys()),
        },
    )

    flag_data = await get_flag(db, flag.feature_name)
    return FeatureFlagResponse(**flag_data)


@router.delete(
    "/{feature_name}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("feature_flags.delete"))],
)
async def delete(
    feature_name: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a feature flag rule."""
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.feature_name == feature_name)
    )
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag introuvable")

    flag_id = flag.id
    await db.delete(flag)
    await db.flush()

    await event_bus.emit(
        "feature_flags.rule_deleted",
        db=db,
        actor_id=current_user.id,
        resource_type="feature_flag",
        resource_id=flag_id,
        payload={
            "actor_name": f"{current_user.first_name} {current_user.last_name}",
            "feature_name": feature_name,
        },
    )


@router.post(
    "/evaluate",
    response_model=FlagEvaluationResponse,
    dependencies=[Depends(require_permission("feature_flags.read"))],
)
async def simulate_evaluation(
    data: FlagEvaluationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Simulate flag evaluation for a given user (admin tool)."""
    result = await evaluate_flag(db, data.feature_name, data.user_id)
    return FlagEvaluationResponse(
        feature_name=data.feature_name,
        **result,
    )


@router.get(
    "/evaluate/me/{feature_name}",
    response_model=FlagEvaluationResponse,
    dependencies=[Depends(require_permission("feature_flags.read"))],
)
async def evaluate_me(
    feature_name: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate a flag for the current user."""
    result = await evaluate_flag(db, feature_name, current_user.id)
    return FlagEvaluationResponse(
        feature_name=feature_name,
        **result,
    )
