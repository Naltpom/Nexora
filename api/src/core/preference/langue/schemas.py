"""Preference langue schemas."""

from pydantic import BaseModel


class LanguageUpdateRequest(BaseModel):
    language: str


class LanguageResponse(BaseModel):
    language: str
    available: list[dict]
    access_token: str | None = None
