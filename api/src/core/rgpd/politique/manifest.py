from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.politique",
    label="Pages legales",
    description="Pages legales editables : politique de confidentialite, CGU, mentions legales",
    parent="rgpd",
    permissions=["rgpd.politique.read", "rgpd.politique.manage"],
    tutorials=[
        {
            "permission": "rgpd.politique.manage",
            "label": "Editer les pages legales",
            "description": "Modifiez le contenu des pages legales de la plateforme.",
            "steps": [{"target": ".rgpd-legal-list", "title": "Pages legales", "description": "Editez les pages legales : politique de confidentialite, CGU, mentions legales. Cliquez sur \"Editer\" pour modifier le contenu.", "position": "top", "navigateTo": "/admin/rgpd?tab=pages"}],
        },
    ],
)
