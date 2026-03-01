from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.registre",
    label="Registre des traitements",
    description="Registre des traitements de donnees personnelles (Article 30 RGPD)",
    parent="rgpd",
    permissions=["rgpd.registre.read", "rgpd.registre.manage"],
    tutorials=[
        {
            "permission": "rgpd.registre.read",
            "label": "Administration RGPD",
            "description": "Gerez le registre des traitements, les demandes de droits et les pages legales.",
            "steps": [{"target": ".rgpd-tabs", "title": "Onglets d'administration", "description": "Naviguez entre le registre des traitements, les demandes de droits, l'audit et les pages legales.", "position": "bottom", "navigateTo": "/admin/rgpd?tab=registre"}],
        },
        {
            "permission": "rgpd.registre.manage",
            "label": "Gerer le registre",
            "description": "Ajoutez, modifiez et supprimez les traitements du registre RGPD.",
            "steps": [{"target": ".rgpd-section-header", "title": "Gestion du registre", "description": "Cliquez sur \"Ajouter un traitement\" pour creer une nouvelle entree au registre Article 30.", "position": "bottom", "navigateTo": "/admin/rgpd?tab=registre"}],
        },
    ],
)
