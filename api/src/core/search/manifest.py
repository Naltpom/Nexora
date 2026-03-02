from ..feature_registry import FeatureManifest
from . import event_handlers  # noqa: F401 — subscribe to event bus at import

manifest = FeatureManifest(
    name="search",
    label="Recherche",
    description="Recherche globale full-text via Meilisearch",
    is_core=True,
    permissions=[
        "search.global",
        "search.reindex",
    ],
    events=[
        {
            "event_type": "search.reindex_started",
            "label": "Reindexation demarree",
            "category": "Recherche",
            "description": "Une reindexation complete a ete demarree",
        },
        {
            "event_type": "search.reindex_completed",
            "label": "Reindexation terminee",
            "category": "Recherche",
            "description": "Une reindexation complete est terminee",
        },
    ],
    tutorials=[
        {
            "permission": "search.global",
            "label": "Recherche globale",
            "description": "Recherchez rapidement utilisateurs, annonces et plus depuis la barre de recherche.",
            "steps": [
                {
                    "target": ".search-trigger",
                    "title": "Recherche globale",
                    "description": "Cliquez ici ou utilisez Ctrl+K pour ouvrir la recherche globale.",
                    "position": "bottom",
                },
            ],
        },
    ],
    tutorial_order=10,
    router_module="src.core.search.routes",
    router_prefix="/api/search",
    router_tags=["Search"],
)
