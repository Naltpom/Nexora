"""Didacticiel schemas."""

from pydantic import BaseModel


class PermissionSeenRequest(BaseModel):
    permission: str


class PermissionSeenResponse(BaseModel):
    permissions_seen: dict[str, str]  # {permission_code: iso_timestamp}


class TutorialOrderingResponse(BaseModel):
    feature_order: list[str]
    permission_order: dict[str, list[str]]


class TutorialOrderingUpdate(BaseModel):
    feature_order: list[str]
    permission_order: dict[str, list[str]]


class TutorialStepResponse(BaseModel):
    target: str
    title: str
    description: str
    position: str = "auto"
    navigateTo: str | None = None
    delay: int | None = None


class PermissionTutorialResponse(BaseModel):
    permission: str
    label: str
    description: str | None = None
    steps: list[TutorialStepResponse]


class FeatureTutorialResponse(BaseModel):
    featureName: str
    label: str
    description: str | None = None
    permissionTutorials: list[PermissionTutorialResponse]
