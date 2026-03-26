from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="favorite",
    label="Favoris",
    description="Systeme de favoris generique pour acces rapide aux pages",
    permissions=[
        "favorite.read",
        "favorite.create",
        "favorite.update",
        "favorite.delete",
    ],
    events=[
        {
            "event_type": "favorite.created",
            "label": "Favori ajoute",
            "category": "Favoris",
            "description": "Un favori a ete ajoute",
        },
        {
            "event_type": "favorite.updated",
            "label": "Favori modifie",
            "category": "Favoris",
            "description": "Un favori a ete modifie",
        },
        {
            "event_type": "favorite.deleted",
            "label": "Favori supprime",
            "category": "Favoris",
            "description": "Un favori a ete supprime",
        },
    ],
    tutorials=[
        {
            "permission": "favorite.read",
            "label": "Utiliser les favoris",
            "description": "Ajoutez des pages en favori pour y acceder rapidement.",
            "steps": [
                {
                    "target": ".favorite-bell-btn",
                    "title": "Bouton favoris",
                    "description": "Cliquez ici pour voir vos pages favorites et en ajouter de nouvelles.",
                    "position": "bottom",
                },
            ],
        },
    ],
    tutorial_order=45,
    router_module="src.core.favorite.routes",
    router_prefix="/api/favorites",
    router_tags=["Favorites"],
)
