from ...feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference.didacticiel",
    label="Didacticiel",
    description="Systeme de tutoriels in-app avec mise en surbrillance",
    parent="preference",
    permissions=["preference.didacticiel.read", "preference.didacticiel.manage"],
    tutorials=[
        {
            "permission": "preference.didacticiel.read",
            "label": "Decouvrir la page Aide",
            "description": "Accedez aux tutoriels et a l'aide en ligne.",
            "steps": [{"target": ".tutorial-section", "title": "Page Aide", "description": "Retrouvez ici tous les tutoriels disponibles, organises par fonctionnalite.", "position": "top", "navigateTo": "/aide"}],
        },
        {
            "permission": "preference.didacticiel.manage",
            "label": "Reordonner les tutoriels",
            "description": "Personnalisez l'ordre d'affichage des tutoriels.",
            "steps": [{"target": ".tutorial-admin-section", "title": "Gestion des tutoriels", "description": "Reordonnez les tutoriels par glisser-deposer pour les adapter a vos besoins.", "position": "top", "navigateTo": "/aide"}],
        },
    ],
    router_module="src.core.preference.didacticiel.routes",
    router_prefix="/api/preference/didacticiel",
    router_tags=["Didacticiel"],
)
