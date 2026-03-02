"""Serializers for converting DB models to Meilisearch documents."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .._identity.models import User
    from ..announcement.models import Announcement


def serialize_user(user: "User") -> dict:
    """Serialize a User record for Meilisearch indexation."""
    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "full_name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def user_base_filter():
    """Return a SQLAlchemy filter for users to index (exclude soft-deleted)."""
    from .._identity.models import User

    return User.deleted_at.is_(None)


def serialize_announcement(announcement: "Announcement") -> dict:
    """Serialize an Announcement record for Meilisearch indexation."""
    return {
        "id": announcement.id,
        "title": announcement.title or "",
        "body": announcement.body or "",
        "type": announcement.type,
        "is_active": announcement.is_active,
        "priority": announcement.priority,
        "created_at": announcement.created_at.isoformat() if announcement.created_at else None,
    }
