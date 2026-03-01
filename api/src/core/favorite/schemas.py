from datetime import datetime

from pydantic import BaseModel, Field


class FavoriteResponse(BaseModel):
    id: int
    label: str
    icon: str | None = None
    url: str
    position: int
    created_at: datetime


class FavoriteCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    icon: str | None = Field(None, max_length=50)
    url: str = Field(..., min_length=1, max_length=2000)


class FavoriteUpdate(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=255)
    icon: str | None = Field(None, max_length=50)


class FavoriteReorder(BaseModel):
    ids: list[int]
