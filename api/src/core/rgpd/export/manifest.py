from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.export",
    label="Export des donnees",
    description="Export des donnees personnelles de l'utilisateur (Article 20 RGPD — portabilite)",
    parent="rgpd",
    permissions=["rgpd.export.read"],
    tutorials=[
        {
            "permission": "rgpd.export.read",
            "label": "Exporter vos donnees",
            "description": "Telechargez une copie de vos donnees personnelles.",
            "steps": [{"target": ".rgpd-export-buttons", "title": "Export de donnees", "description": "Exportez vos donnees personnelles au format CSV ou JSON.", "position": "bottom", "navigateTo": "/rgpd/my-data"}],
        },
    ],
)
