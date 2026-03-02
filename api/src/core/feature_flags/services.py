"""Feature flags services."""

from __future__ import annotations

import hashlib
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import FeatureFlag


def _deterministic_hash(user_id: int, feature_name: str) -> int:
    """SHA-256 hash of user_id:feature_name, returns 0-99."""
    raw = f"{user_id}:{feature_name}"
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return int(digest, 16) % 100


async def _get_user_role_slugs(db: AsyncSession, user_id: int) -> list[str]:
    """Get role slugs for a user."""
    from .._identity.models import Role, UserRole

    result = await db.execute(
        select(Role.slug)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return [row[0] for row in result.all()]


async def evaluate_flag(
    db: AsyncSession,
    feature_name: str,
    user_id: int,
) -> dict[str, Any]:
    """Evaluate a feature flag for a given user.

    Returns dict with keys: enabled, variant, strategy, reason.
    If no FeatureFlag row exists, returns enabled=True (backward compat).
    """
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.feature_name == feature_name)
    )
    flag = result.scalar_one_or_none()

    if flag is None:
        return {
            "enabled": True,
            "variant": None,
            "strategy": "boolean",
            "reason": "no_rule",
        }

    if not flag.is_enabled:
        return {
            "enabled": False,
            "variant": None,
            "strategy": flag.strategy,
            "reason": "flag_disabled",
        }

    if flag.strategy == "boolean":
        return {
            "enabled": True,
            "variant": None,
            "strategy": "boolean",
            "reason": "boolean_enabled",
        }

    if flag.strategy == "percentage":
        bucket = _deterministic_hash(user_id, feature_name)
        enabled = bucket < flag.rollout_percentage
        return {
            "enabled": enabled,
            "variant": None,
            "strategy": "percentage",
            "reason": f"bucket={bucket}, threshold={flag.rollout_percentage}",
        }

    if flag.strategy == "targeted":
        # Check target_users first
        if flag.target_users and user_id in flag.target_users:
            return {
                "enabled": True,
                "variant": None,
                "strategy": "targeted",
                "reason": "user_targeted",
            }

        # Check target_roles
        if flag.target_roles:
            user_roles = await _get_user_role_slugs(db, user_id)
            if any(role in flag.target_roles for role in user_roles):
                return {
                    "enabled": True,
                    "variant": None,
                    "strategy": "targeted",
                    "reason": "role_targeted",
                }

        return {
            "enabled": False,
            "variant": None,
            "strategy": "targeted",
            "reason": "not_targeted",
        }

    if flag.strategy == "ab_test":
        if not flag.variants:
            return {
                "enabled": True,
                "variant": None,
                "strategy": "ab_test",
                "reason": "no_variants_defined",
            }

        bucket = _deterministic_hash(user_id, feature_name)
        cumulative = 0
        selected_variant = flag.variants[-1]["name"]
        for variant in flag.variants:
            cumulative += variant.get("weight", 0)
            if bucket < cumulative:
                selected_variant = variant["name"]
                break

        return {
            "enabled": True,
            "variant": selected_variant,
            "strategy": "ab_test",
            "reason": f"bucket={bucket}, variant={selected_variant}",
        }

    return {
        "enabled": True,
        "variant": None,
        "strategy": flag.strategy,
        "reason": "unknown_strategy_fallback",
    }


async def list_flags(db: AsyncSession) -> list[dict[str, Any]]:
    """List all feature flags with metadata."""
    from .._identity.models import User
    from ..feature_registry import get_registry

    result = await db.execute(
        select(FeatureFlag, User)
        .outerjoin(User, FeatureFlag.created_by_id == User.id)
        .order_by(FeatureFlag.feature_name)
    )

    registry = get_registry()
    flags = []
    for flag, creator in result.all():
        feature_label = None
        is_feature_active = None
        if registry:
            manifest = registry.manifests.get(flag.feature_name)
            if manifest:
                feature_label = manifest.label
            is_feature_active = registry.is_active(flag.feature_name)

        flags.append({
            "id": flag.id,
            "feature_name": flag.feature_name,
            "feature_label": feature_label,
            "is_feature_active": is_feature_active,
            "strategy": flag.strategy,
            "description": flag.description,
            "rollout_percentage": flag.rollout_percentage,
            "target_roles": flag.target_roles,
            "target_users": flag.target_users,
            "variants": flag.variants,
            "is_enabled": flag.is_enabled,
            "created_by_id": flag.created_by_id,
            "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else None,
            "updated_by_id": flag.updated_by_id,
            "created_at": flag.created_at,
            "updated_at": flag.updated_at,
        })

    return flags


async def get_flag(db: AsyncSession, feature_name: str) -> dict[str, Any] | None:
    """Get a single feature flag by feature_name with metadata."""
    from .._identity.models import User
    from ..feature_registry import get_registry

    result = await db.execute(
        select(FeatureFlag, User)
        .outerjoin(User, FeatureFlag.created_by_id == User.id)
        .where(FeatureFlag.feature_name == feature_name)
    )
    row = result.one_or_none()
    if not row:
        return None

    flag, creator = row
    registry = get_registry()
    feature_label = None
    is_feature_active = None
    if registry:
        manifest = registry.manifests.get(flag.feature_name)
        if manifest:
            feature_label = manifest.label
        is_feature_active = registry.is_active(flag.feature_name)

    return {
        "id": flag.id,
        "feature_name": flag.feature_name,
        "feature_label": feature_label,
        "is_feature_active": is_feature_active,
        "strategy": flag.strategy,
        "description": flag.description,
        "rollout_percentage": flag.rollout_percentage,
        "target_roles": flag.target_roles,
        "target_users": flag.target_users,
        "variants": flag.variants,
        "is_enabled": flag.is_enabled,
        "created_by_id": flag.created_by_id,
        "created_by_name": f"{creator.first_name} {creator.last_name}" if creator else None,
        "updated_by_id": flag.updated_by_id,
        "created_at": flag.created_at,
        "updated_at": flag.updated_at,
    }
