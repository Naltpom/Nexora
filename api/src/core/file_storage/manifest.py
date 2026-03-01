from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="file_storage",
    label="Gestion de fichiers",
    description="Upload, stockage et gestion de fichiers avec quotas, scan antivirus et moderation",
    permissions=[
        "file_storage.upload",
        "file_storage.read",
        "file_storage.delete",
        "file_storage.moderate",
        "file_storage.policies",
        "file_storage.admin",
    ],
    events=[
        {
            "event_type": "file_storage.uploaded",
            "label": "Fichier uploade",
            "category": "Fichiers",
            "description": "Un fichier a ete uploade",
        },
        {
            "event_type": "file_storage.deleted",
            "label": "Fichier supprime",
            "category": "Fichiers",
            "description": "Un fichier a ete supprime",
        },
        {
            "event_type": "file_storage.approved",
            "label": "Fichier approuve",
            "category": "Fichiers",
            "description": "Un fichier a ete approuve par un moderateur",
        },
        {
            "event_type": "file_storage.rejected",
            "label": "Fichier rejete",
            "category": "Fichiers",
            "description": "Un fichier a ete rejete par un moderateur",
        },
        {
            "event_type": "file_storage.policy_updated",
            "label": "Politique de moderation mise a jour",
            "category": "Fichiers",
            "description": "Une politique de moderation fichier a ete creee ou mise a jour",
        },
        {
            "event_type": "file_storage.policy_deleted",
            "label": "Politique de moderation supprimee",
            "category": "Fichiers",
            "description": "Une politique de moderation fichier a ete supprimee",
        },
    ],
    tutorials=[
        {
            "permission": "file_storage.admin",
            "label": "Gerer les fichiers",
            "description": "Consultez, filtrez et moderez les fichiers uploades par les utilisateurs.",
            "steps": [
                {
                    "target": ".fs-admin-search",
                    "title": "Recherche de fichiers",
                    "description": "Recherchez un fichier par son nom dans la barre de recherche.",
                    "position": "bottom",
                    "navigateTo": "/admin/files",
                },
                {
                    "target": ".fs-admin-filters",
                    "title": "Filtrer par statut",
                    "description": "Filtrez les fichiers par statut de moderation : tous, en attente, approuves ou rejetes.",
                    "position": "bottom",
                },
                {
                    "target": ".unified-card.card-table",
                    "title": "Liste des fichiers",
                    "description": "Consultez tous les fichiers avec leur apercu, type, taille, proprietaire et statut de moderation.",
                    "position": "top",
                },
                {
                    "target": ".page-header-stats",
                    "title": "Statistiques globales",
                    "description": "Visualisez le nombre total de fichiers, l'espace utilise et les fichiers en attente de moderation.",
                    "position": "bottom",
                },
            ],
        },
        {
            "permission": "file_storage.moderate",
            "label": "Moderer les fichiers",
            "description": "Approuvez ou rejetez les fichiers en attente de moderation.",
            "steps": [
                {
                    "target": ".fs-admin-filter-tab",
                    "title": "Fichiers en attente",
                    "description": "Cliquez sur le filtre 'En attente' pour afficher uniquement les fichiers a moderer.",
                    "position": "bottom",
                    "navigateTo": "/admin/files",
                },
                {
                    "target": ".fs-file-action-btn--approve",
                    "title": "Approuver un fichier",
                    "description": "Cliquez sur le bouton vert pour approuver un fichier. Il sera alors accessible aux utilisateurs.",
                    "position": "left",
                },
                {
                    "target": ".fs-file-action-btn--reject",
                    "title": "Rejeter un fichier",
                    "description": "Cliquez sur le bouton orange pour rejeter un fichier non conforme.",
                    "position": "left",
                },
            ],
        },
        {
            "permission": "file_storage.policies",
            "label": "Politiques de moderation",
            "description": "Configurez les politiques de moderation par type de ressource.",
            "steps": [
                {
                    "target": ".fs-policies-add-form",
                    "title": "Ajouter une politique",
                    "description": "Saisissez un type de ressource (ex: avatar, document) et cliquez sur Ajouter pour creer une politique.",
                    "position": "bottom",
                    "navigateTo": "/admin/file-policies",
                },
                {
                    "target": ".fs-policies-toggle-switch",
                    "title": "Activer la moderation",
                    "description": "Activez ou desactivez la moderation pour chaque type de ressource. Les fichiers uploades pour ce type devront etre approuves avant publication.",
                    "position": "left",
                },
                {
                    "target": ".unified-card.card-table",
                    "title": "Liste des politiques",
                    "description": "Consultez toutes les politiques configurees avec leur statut de moderation et la date de derniere modification.",
                    "position": "top",
                },
            ],
        },
        {
            "permission": "file_storage.upload",
            "label": "Uploader des fichiers",
            "description": "Decouvrez comment uploader et gerer vos fichiers.",
            "steps": [
                {
                    "target": ".fs-upload-zone",
                    "title": "Zone d'upload",
                    "description": "Glissez-deposez un fichier dans cette zone ou cliquez pour parcourir vos fichiers. Les types et tailles autorises sont indiques.",
                    "position": "bottom",
                },
                {
                    "target": ".fs-quota",
                    "title": "Quota de stockage",
                    "description": "Surveillez votre espace de stockage utilise. La barre change de couleur lorsque vous approchez de la limite.",
                    "position": "top",
                },
            ],
        },
    ],
    tutorial_order=50,
    config_keys=["STORAGE_BACKEND", "ANTIVIRUS_ENABLED", "ANTIVIRUS_HOST"],
    router_module="src.core.file_storage.routes",
    router_prefix="/api/file-storage",
    router_tags=["FileStorage"],
    extra_routers=[
        {
            "module": "src.core.file_storage.routes_admin",
            "prefix": "/api/file-storage/admin",
            "tags": ["FileStorageAdmin"],
        },
    ],
)
