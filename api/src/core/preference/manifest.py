from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="preference",
    label="Preferences",
    description="Gestion des preferences utilisateur (theme, tutoriels, etc.)",
    children=[
        "preference.theme",
        "preference.couleur",
        "preference.font",
        "preference.layout",
        "preference.composants",
        "preference.accessibilite",
        "preference.langue",
        "preference.didacticiel",
    ],
    permissions=["preference.read"],
    events=[
        {"event_type": "preference.updated", "label": "Preferences modifiees", "category": "Preferences", "description": "Un utilisateur a modifie ses preferences"},
    ],
    tutorials=[
        {
            "permission": "preference.read",
            "label": "Preferences utilisateur",
            "description": "Decouvrez la page de preferences.",
            "steps": [{"target": ".header-theme-toggle", "title": "Theme", "description": "Basculez entre le theme clair et sombre avec ce bouton.", "position": "bottom"}],
        },
    ],
    tutorial_order=10,
)
