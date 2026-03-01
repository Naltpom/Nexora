from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.audit",
    label="Audit RGPD",
    description="Journal d'audit des acces aux donnees personnelles",
    parent="rgpd",
    permissions=["rgpd.audit.read"],
    tutorials=[
        {
            "permission": "rgpd.audit.read",
            "label": "Consulter l'audit RGPD",
            "description": "Consultez le journal des acces aux donnees personnelles.",
            "steps": [{"target": ".rgpd-audit-table", "title": "Journal d'audit", "description": "Suivez les acces aux donnees personnelles : qui, quand, quelle action et sur quelle ressource.", "position": "top", "navigateTo": "/admin/rgpd?tab=audit"}],
        },
    ],
)
