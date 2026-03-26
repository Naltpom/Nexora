from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="feature_flags",
    label="Feature Flags",
    description="Regles avancees de feature flags : rollout pourcentage, ciblage role/user, A/B testing",
    is_core=True,
    permissions=[
        "feature_flags.read",
        "feature_flags.create",
        "feature_flags.update",
        "feature_flags.delete",
    ],
    events=[
        {
            "event_type": "feature_flags.rule_created",
            "label": "Regle de flag creee",
            "category": "Feature Flags",
            "description": "Une nouvelle regle de feature flag a ete creee",
        },
        {
            "event_type": "feature_flags.rule_updated",
            "label": "Regle de flag modifiee",
            "category": "Feature Flags",
            "description": "Une regle de feature flag a ete modifiee",
        },
        {
            "event_type": "feature_flags.rule_deleted",
            "label": "Regle de flag supprimee",
            "category": "Feature Flags",
            "description": "Une regle de feature flag a ete supprimee",
        },
    ],
    router_module="src.core.feature_flags.routes",
    router_prefix="/api/feature-flags",
    router_tags=["FeatureFlags"],
)
