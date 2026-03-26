"""Subscribe to CRUD events for incremental Meilisearch sync.

Core entity handlers (users, announcements) are registered here.
Feature-specific search handlers are registered automatically by the
feature_registry via setup_feature_search_handlers().
"""

import logging

from ..events import event_bus

logger = logging.getLogger(__name__)


# ── Core entity handlers ─────────────────────────────────────────


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


# ── Core event subscriptions ─────────────────────────────────────

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


# ── Feature search handler registration ──────────────────────────


def setup_feature_search_handlers() -> None:
    """Register search event handlers from features that declare search_indexes.

    Features that declare search_indexes in their manifest get automatic
    CRUD event handlers for their entities. The feature's manifest must
    provide a search_indexes config with the index_name, model_module, and
    model_class. The feature can optionally provide a serializers module
    with a serialize_<entity> function.

    This function is called once at startup after all features are loaded.
    Features can also register their own custom event handlers directly
    by importing event_bus and calling event_bus.subscribe() in their
    own event_handlers.py module.
    """
    from ..config import settings

    if not settings.MEILISEARCH_ENABLED:
        return

    from ..feature_registry import get_registry

    registry = get_registry()
    if not registry:
        return

    for manifest, idx_config in registry.collect_search_indexes():
        _register_feature_index_handlers(manifest, idx_config)


def _register_feature_index_handlers(manifest, idx_config) -> None:
    """Register CRUD event handlers for a feature's search index.

    Auto-subscribes to <feature_name>.created, .updated, .deleted events.
    """
    import importlib

    feature_name = manifest.name
    index_name = idx_config.index_name
    model_module = idx_config.model_module
    model_class_name = idx_config.model_class

    # Derive event prefix from feature name (e.g. "my_feature" -> "my_feature.*")
    # Features can use dotted names like "parent.child"
    event_prefix = feature_name.split(".")[-1] if "." in feature_name else feature_name

    async def _on_change(db=None, resource_type=None, resource_id=None, **kwargs):
        if resource_id is None or db is None:
            return

        from ..config import settings as _s

        if not _s.MEILISEARCH_ENABLED:
            return

        try:
            mod = importlib.import_module(model_module)
            model_cls = getattr(mod, model_class_name)
        except (ImportError, AttributeError) as e:
            logger.warning("Search handler: cannot import %s.%s: %s", model_module, model_class_name, e)
            return

        from sqlalchemy import select

        entity = (await db.execute(select(model_cls).where(model_cls.id == resource_id))).scalar_one_or_none()

        deleted_at = getattr(entity, "deleted_at", None) if entity else None
        if not entity or deleted_at is not None:
            from .services import delete_document

            await delete_document(index_name, resource_id)
        else:
            # Try to find a serializer in the feature's serializers module
            serializer_module = model_module.rsplit(".", 1)[0] + ".serializers"
            serialize_fn = None
            try:
                ser_mod = importlib.import_module(serializer_module)
                # Look for serialize_<model_class_name_lower> function
                fn_name = f"serialize_{model_class_name.lower()}"
                serialize_fn = getattr(ser_mod, fn_name, None)
                if serialize_fn is None:
                    # Try serialize_<index_name_singular>
                    fn_name2 = f"serialize_{index_name.rstrip('s')}"
                    serialize_fn = getattr(ser_mod, fn_name2, None)
            except ImportError:
                pass

            from .services import index_single

            if serialize_fn:
                await index_single(index_name, serialize_fn(entity))
            else:
                # Fallback: index the entity's __dict__ minus internal fields
                doc = {k: v for k, v in entity.__dict__.items() if not k.startswith("_")}
                await index_single(index_name, doc)

    async def _on_deleted(resource_id=None, **kwargs):
        if resource_id is None:
            return

        from ..config import settings as _s

        if not _s.MEILISEARCH_ENABLED:
            return

        from .services import delete_document

        await delete_document(index_name, resource_id)

    # Subscribe to standard CRUD events
    for event_suffix in ("created", "updated"):
        event_bus.subscribe(f"{event_prefix}.{event_suffix}", _on_change)
    event_bus.subscribe(f"{event_prefix}.deleted", _on_deleted)

    logger.debug(
        "Registered search handlers for feature '%s' index '%s' (events: %s.*)",
        feature_name, index_name, event_prefix,
    )
