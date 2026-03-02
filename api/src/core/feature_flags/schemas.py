"""Feature flags schemas."""

from datetime import datetime

from pydantic import BaseModel, field_validator


class FeatureFlagCreate(BaseModel):
    feature_name: str
    strategy: str = "boolean"
    description: str | None = None
    rollout_percentage: int = 100
    target_roles: list[str] | None = None
    target_users: list[int] | None = None
    variants: list[dict] | None = None
    is_enabled: bool = True

    @field_validator("strategy")
    @classmethod
    def validate_strategy(cls, v: str) -> str:
        allowed = {"boolean", "percentage", "targeted", "ab_test"}
        if v not in allowed:
            raise ValueError(f"Strategy must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("rollout_percentage")
    @classmethod
    def validate_rollout_percentage(cls, v: int) -> int:
        if v < 0 or v > 100:
            raise ValueError("rollout_percentage must be between 0 and 100")
        return v

    @field_validator("variants")
    @classmethod
    def validate_variants(cls, v: list[dict] | None, info) -> list[dict] | None:
        if v is None:
            return v
        strategy = info.data.get("strategy", "boolean")
        if strategy == "ab_test":
            if len(v) < 2:
                raise ValueError("A/B test requires at least 2 variants")
            total = sum(variant.get("weight", 0) for variant in v)
            if total != 100:
                raise ValueError(f"Variant weights must sum to 100, got {total}")
            for variant in v:
                if "name" not in variant:
                    raise ValueError("Each variant must have a 'name' field")
        return v


class FeatureFlagUpdate(BaseModel):
    strategy: str | None = None
    description: str | None = None
    rollout_percentage: int | None = None
    target_roles: list[str] | None = None
    target_users: list[int] | None = None
    variants: list[dict] | None = None
    is_enabled: bool | None = None

    @field_validator("strategy")
    @classmethod
    def validate_strategy(cls, v: str | None) -> str | None:
        if v is None:
            return v
        allowed = {"boolean", "percentage", "targeted", "ab_test"}
        if v not in allowed:
            raise ValueError(f"Strategy must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("rollout_percentage")
    @classmethod
    def validate_rollout_percentage(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 0 or v > 100:
            raise ValueError("rollout_percentage must be between 0 and 100")
        return v


class FeatureFlagResponse(BaseModel):
    id: int
    feature_name: str
    feature_label: str | None = None
    is_feature_active: bool | None = None
    strategy: str
    description: str | None = None
    rollout_percentage: int
    target_roles: list[str] | None = None
    target_users: list[int] | None = None
    variants: list[dict] | None = None
    is_enabled: bool
    created_by_id: int | None = None
    created_by_name: str | None = None
    updated_by_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FlagEvaluationRequest(BaseModel):
    feature_name: str
    user_id: int


class FlagEvaluationResponse(BaseModel):
    feature_name: str
    enabled: bool
    variant: str | None = None
    strategy: str
    reason: str
