from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd.droits",
    label="Exercice des droits",
    description="Gestion des demandes d'exercice de droits RGPD (acces, suppression, portabilite...)",
    parent="rgpd",
    permissions=["rgpd.droits.read", "rgpd.droits.manage"],
    tutorials=[
        {
            "permission": "rgpd.droits.read",
            "label": "Exercer vos droits",
            "description": "Soumettez une demande d'exercice de vos droits RGPD.",
            "steps": [{"target": ".rgpd-rights-cta", "title": "Demande de droits", "description": "Soumettez une demande d'acces, de rectification, d'effacement ou de portabilite de vos donnees.", "position": "top", "navigateTo": "/rgpd/my-data"}],
        },
        {
            "permission": "rgpd.droits.manage",
            "label": "Traiter les demandes de droits",
            "description": "Repondez aux demandes d'exercice de droits des utilisateurs.",
            "steps": [{"target": ".rgpd-tabs", "title": "Demandes de droits", "description": "Consultez les demandes en attente et traitez-les : acceptation, refus ou mise en cours. Cliquez sur \"Traiter\" pour repondre.", "position": "bottom", "navigateTo": "/admin/rgpd?tab=droits"}],
        },
    ],
)
