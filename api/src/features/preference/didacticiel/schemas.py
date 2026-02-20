"""Didacticiel schemas."""

from pydantic import BaseModel


class TutorialSeenRequest(BaseModel):
    tutorial_id: str


class TutorialSeenResponse(BaseModel):
    tutorials_seen: dict[str, str]  # {tutorial_id: iso_timestamp}
