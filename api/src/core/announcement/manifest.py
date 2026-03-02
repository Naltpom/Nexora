from ..feature_registry import FeatureManifest, SearchIndexConfig

manifest = FeatureManifest(
    name="announcement",
    label="Annonces",
    description="Bannieres d'annonces systeme (maintenance, nouvelles features)",
    permissions=[
        "announcement.read",
        "announcement.manage",
    ],
    events=[
        {
            "event_type": "announcement.created",
            "label": "Annonce creee",
            "category": "Annonces",
            "description": "Une nouvelle annonce systeme a ete creee",
        },
        {
            "event_type": "announcement.updated",
            "label": "Annonce modifiee",
            "category": "Annonces",
            "description": "Une annonce systeme a ete modifiee",
        },
        {
            "event_type": "announcement.deleted",
            "label": "Annonce supprimee",
            "category": "Annonces",
            "description": "Une annonce systeme a ete supprimee",
        },
    ],
    tutorials=[
        {
            "permission": "announcement.manage",
            "label": "Gerer les annonces",
            "description": "Creez, modifiez et supprimez les annonces systeme.",
            "steps": [
                {
                    "target": ".unified-page-header",
                    "title": "Administration des annonces",
                    "description": "Gerez les bannieres d'annonce : creez-en de nouvelles, ciblez par role, definissez des dates d'affichage.",
                    "position": "bottom",
                    "navigateTo": "/admin/announcements",
                },
            ],
        },
    ],
    tutorial_order=55,
    search_indexes=[
        SearchIndexConfig(
            index_name="announcements",
            model_module="src.core.announcement.models",
            model_class="Announcement",
            searchable_attributes=["title", "body"],
            filterable_attributes=["type", "is_active"],
            sortable_attributes=["created_at", "priority"],
            serializer_module="src.core.search.serializers",
            serializer_function="serialize_announcement",
            read_permission="announcement.read",
        ),
    ],
    depends=["realtime"],
    router_module="src.core.announcement.routes",
    router_prefix="/api/announcements",
    router_tags=["Announcements"],
)
