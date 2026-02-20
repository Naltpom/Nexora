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
