"""Comments feature schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    resource_type: str = Field(..., min_length=1, max_length=100)
    resource_id: int
    content: str = Field(..., min_length=1, max_length=10000)
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class CommentResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_name: str
    resource_type: str
    resource_id: int
    content: str
    parent_id: int | None = None
    is_edited: bool
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime
    status: str = "approved"


class MentionUserResponse(BaseModel):
    id: int
    email: str
    name: str


class MentionUserFullResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str


# -- Admin moderation --

class AdminCommentResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    user_name: str
    resource_type: str
    resource_id: int
    content: str
    parent_id: int | None = None
    is_edited: bool
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    created_at: datetime
    status: str
    moderated_by_id: int | None = None
    moderated_by_email: str | None = None
    moderated_at: datetime | None = None


# -- Policies --

class PolicyCreate(BaseModel):
    resource_type: str = Field(..., min_length=1, max_length=100)
    requires_moderation: bool = False


class PolicyResponse(BaseModel):
    resource_type: str
    requires_moderation: bool
    updated_at: datetime
    updated_by_id: int | None = None
