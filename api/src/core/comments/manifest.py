from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="comments",
    label="Commentaires",
    description="Systeme de commentaires generique attachable a n'importe quelle entite",
    permissions=[
        "comments.read",
        "comments.create",
        "comments.update",
        "comments.delete",
        "comments.admin",
        "comments.moderate",
        "comments.policies",
    ],
    events=[
        {
            "event_type": "comments.created",
            "label": "Commentaire cree",
            "category": "Comments",
            "description": "Un nouveau commentaire a ete cree",
        },
        {
            "event_type": "comments.updated",
            "label": "Commentaire modifie",
            "category": "Comments",
            "description": "Un commentaire a ete modifie",
        },
        {
            "event_type": "comments.deleted",
            "label": "Commentaire supprime",
            "category": "Comments",
            "description": "Un commentaire a ete supprime",
        },
        {
            "event_type": "comments.approved",
            "label": "Commentaire approuve",
            "category": "Comments",
            "description": "Un commentaire a ete approuve par un moderateur",
        },
        {
            "event_type": "comments.rejected",
            "label": "Commentaire rejete",
            "category": "Comments",
            "description": "Un commentaire a ete rejete par un moderateur",
        },
        {
            "event_type": "comments.policy_created",
            "label": "Politique de moderation creee",
            "category": "Comments",
            "description": "Une politique de moderation de commentaires a ete creee",
        },
        {
            "event_type": "comments.policy_updated",
            "label": "Politique de moderation modifiee",
            "category": "Comments",
            "description": "Une politique de moderation de commentaires a ete modifiee",
        },
        {
            "event_type": "comments.policy_deleted",
            "label": "Politique de moderation supprimee",
            "category": "Comments",
            "description": "Une politique de moderation de commentaires a ete supprimee",
        },
    ],
    tutorials=[
        {
            "permission": "comments.read",
            "label": "Utiliser les commentaires",
            "description": "Lisez et participez aux discussions via les commentaires.",
            "steps": [
                {
                    "target": ".comment-section",
                    "title": "Section commentaires",
                    "description": "Consultez les commentaires existants, ajoutez les votres et repondez aux autres utilisateurs.",
                    "position": "top",
                },
            ],
        },
    ],
    tutorial_order=50,
    router_module="src.core.comments.routes",
    router_prefix="/api/comments",
    router_tags=["Comments"],
    extra_routers=[
        {"module": "src.core.comments.routes_admin", "prefix": "/api/comments/admin", "tags": ["CommentsAdmin"]},
        {"module": "src.core.comments.routes_uploads", "prefix": "/api/uploads-rte", "tags": ["UploadsRTE"]},
    ],
)
