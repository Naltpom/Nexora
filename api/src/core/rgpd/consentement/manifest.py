from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.consentement",
    label="Consentement cookies",
    description="Banniere de consentement cookies et enregistrement des choix utilisateur",
    parent="rgpd",
    permissions=["rgpd.consentement.read", "rgpd.consentement.manage"],
    tutorials=[
        {
            "permission": "rgpd.consentement.read",
            "label": "Gerer le consentement cookies",
            "description": "Configurez vos preferences de cookies et traceurs.",
            "steps": [{"target": ".rgpd-consent-list", "title": "Consentement", "description": "Activez ou desactivez chaque categorie de cookies et traceurs selon vos preferences.", "position": "top", "navigateTo": "/rgpd/consent"}],
        },
        {
            "permission": "rgpd.consentement.manage",
            "label": "Administrer les consentements",
            "description": "Gerez les configurations de consentement de la plateforme.",
            "steps": [{"target": ".rgpd-tabs", "title": "Administration des consentements", "description": "Configurez les categories de consentement et suivez les statistiques d'acceptation.", "position": "bottom", "navigateTo": "/admin/rgpd?tab=registre"}],
        },
    ],
)
