from ..feature_registry import FeatureManifest

# Subscribe to the event bus for persistence.
from . import event_handlers  # noqa: F401

manifest = FeatureManifest(
    name="event",
    label="Events",
    description="Event bus persistence and event type catalog",
    version="2026.02.17",
    permissions=[
        "event.read",
    ],
    router_module="src.core.event.routes",
    router_prefix="/api/events",
    router_tags=["Events"],
)
