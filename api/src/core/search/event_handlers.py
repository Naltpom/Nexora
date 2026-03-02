"""Subscribe to CRUD events for incremental Meilisearch sync."""

import logging

from ..events import event_bus

logger = logging.getLogger(__name__)


async def _on_user_change(db=None, resource_type=None, resource_id=None, **kwargs):
    """Handle user create/update events — reindex the user document."""
    if resource_id is None or db is None:
        return

    from ..config import settings

    if not settings.MEILISEARCH_ENABLED:
        return

    from sqlalchemy import select

    from .._identity.models import User

    user = (await db.execute(select(User).where(User.id == resource_id))).scalar_one_or_none()

    if not user or user.deleted_at is not None:
        from .services import delete_document

        await delete_document("users", resource_id)
    else:
        from .serializers import serialize_user
        from .services import index_single

        await index_single("users", serialize_user(user))


async def _on_user_deleted(resource_id=None, **kwargs):
    """Handle user deletion — remove from index."""
    if resource_id is None:
        return

    from ..config import settings

    if not settings.MEILISEARCH_ENABLED:
        return

    from .services import delete_document

    await delete_document("users", resource_id)


async def _on_announcement_change(db=None, resource_type=None, resource_id=None, **kwargs):
    """Handle announcement create/update events."""
    if resource_id is None or db is None:
        return

    from ..config import settings

    if not settings.MEILISEARCH_ENABLED:
        return

    from sqlalchemy import select

    from ..announcement.models import Announcement

    ann = (await db.execute(select(Announcement).where(Announcement.id == resource_id))).scalar_one_or_none()

    if not ann:
        from .services import delete_document

        await delete_document("announcements", resource_id)
    else:
        from .serializers import serialize_announcement
        from .services import index_single

        await index_single("announcements", serialize_announcement(ann))


async def _on_announcement_deleted(resource_id=None, **kwargs):
    """Handle announcement deletion — remove from index."""
    if resource_id is None:
        return

    from ..config import settings

    if not settings.MEILISEARCH_ENABLED:
        return

    from .services import delete_document

    await delete_document("announcements", resource_id)


# ── Subscribe at import time ──────────────────────────────────────

# Users
event_bus.subscribe("user.registered", _on_user_change)
event_bus.subscribe("user.updated", _on_user_change)
event_bus.subscribe("user.roles_updated", _on_user_change)
event_bus.subscribe("user.deactivated", _on_user_change)
event_bus.subscribe("user.invitation_accepted", _on_user_change)
event_bus.subscribe("user.deleted", _on_user_deleted)
event_bus.subscribe("user.account_deleted", _on_user_deleted)

# Announcements
event_bus.subscribe("announcement.created", _on_announcement_change)
event_bus.subscribe("announcement.updated", _on_announcement_change)
event_bus.subscribe("announcement.deleted", _on_announcement_deleted)
