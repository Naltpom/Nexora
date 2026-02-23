from ..feature_registry import FeatureManifest
from .middleware import ImpersonationAuditMiddleware, LastActiveMiddleware

manifest = FeatureManifest(
    name="_identity",
    label="Identity",
    description="Authentication, users, roles, permissions, feature management",
    is_core=True,
    permissions=[
        "users.read", "users.create", "users.update", "users.delete",
        "roles.read", "roles.create", "roles.update", "roles.delete", "roles.assign_super_admin",
        "permissions.read", "permissions.manage",
        "features.read", "features.manage",
        "settings.read", "settings.manage",
        "invitations.create", "invitations.read", "invitations.delete",
        "impersonation.start", "impersonation.read", "impersonation.immune",
        "backups.create", "backups.restore", "backups.read",
        "search.global",
        "commands.read", "commands.manage",
    ],
    events=[
        # Authentification
        {"event_type": "user.login", "label": "Connexion", "category": "Authentification", "description": "Un utilisateur s'est connecte"},
        {"event_type": "user.password_changed", "label": "Mot de passe modifie", "category": "Authentification", "description": "Un utilisateur a modifie son mot de passe"},
        {"event_type": "user.password_reset", "label": "Mot de passe reinitialise", "category": "Authentification", "description": "Un mot de passe a ete reinitialise via token"},
        {"event_type": "user.email_verified", "label": "Email verifie", "category": "Authentification", "description": "Un utilisateur a verifie son adresse email"},
        # Utilisateurs
        {"event_type": "user.registered", "label": "Utilisateur inscrit", "category": "Utilisateurs", "description": "Un nouvel utilisateur s'est inscrit"},
        {"event_type": "user.invited", "label": "Utilisateur invite", "category": "Utilisateurs", "description": "Un utilisateur a ete invite"},
        {"event_type": "user.invitation_accepted", "label": "Invitation acceptee", "category": "Utilisateurs", "description": "Un utilisateur invite a accepte l'invitation"},
        {"event_type": "user.updated", "label": "Profil mis a jour", "category": "Utilisateurs", "description": "Un utilisateur a mis a jour son profil"},
        {"event_type": "user.deactivated", "label": "Utilisateur desactive", "category": "Utilisateurs", "description": "Un utilisateur a ete desactive"},
        {"event_type": "user.deleted", "label": "Utilisateur supprime", "category": "Utilisateurs", "description": "Un compte utilisateur a ete supprime"},
        {"event_type": "user.account_deleted", "label": "Compte auto-supprime", "category": "Utilisateurs", "description": "Un utilisateur a supprime son propre compte"},
        {"event_type": "user.roles_updated", "label": "Roles modifies", "category": "Utilisateurs", "description": "Les roles d'un utilisateur ont ete modifies"},
        # Roles
        {"event_type": "role.created", "label": "Role cree", "category": "Roles", "description": "Un nouveau role a ete cree"},
        {"event_type": "role.updated", "label": "Role modifie", "category": "Roles", "description": "Un role a ete modifie"},
        {"event_type": "role.deleted", "label": "Role supprime", "category": "Roles", "description": "Un role a ete supprime"},
        {"event_type": "role.permissions_updated", "label": "Permissions du role modifiees", "category": "Roles", "description": "Les permissions d'un role ont ete modifiees"},
        # Administration
        {"event_type": "admin.impersonation_started", "label": "Impersonation demarree", "category": "Administration", "description": "Un administrateur impersonifie un utilisateur"},
        {"event_type": "admin.impersonation_stopped", "label": "Impersonation terminee", "category": "Administration", "description": "Une session d'impersonation a ete terminee"},
        {"event_type": "admin.password_reset_triggered", "label": "Reset password declenche", "category": "Administration", "description": "Un admin a declenche la reinitialisation du mot de passe d'un utilisateur"},
        {"event_type": "admin.global_permissions_updated", "label": "Permissions globales modifiees", "category": "Administration", "description": "Les permissions globales ont ete modifiees"},
        {"event_type": "admin.feature_toggled", "label": "Feature activee/desactivee", "category": "Administration", "description": "Une feature a ete activee ou desactivee"},
        {"event_type": "admin.settings_updated", "label": "Parametres modifies", "category": "Administration", "description": "Les parametres de l'application ont ete modifies"},
    ],
    middleware=[ImpersonationAuditMiddleware, LastActiveMiddleware],
    extra_routers=[
        {"module": "src.core._identity.routes_auth", "prefix": "/api/auth", "tags": ["Auth"]},
        {"module": "src.core._identity.routes_users", "prefix": "/api/users", "tags": ["Users"]},
        {"module": "src.core._identity.routes_roles", "prefix": "/api/roles", "tags": ["Roles"]},
        {"module": "src.core._identity.routes_permissions", "prefix": "/api/permissions", "tags": ["Permissions"]},
        {"module": "src.core._identity.routes_features", "prefix": "/api/features", "tags": ["Features"]},
        {"module": "src.core._identity.routes_settings", "prefix": "/api/settings", "tags": ["Settings"]},
        {"module": "src.core._identity.routes_health", "prefix": "/api", "tags": ["Health"]},
        {"module": "src.core._identity.routes_search", "prefix": "/api", "tags": ["Search"]},
        {"module": "src.core._identity.routes_impersonation", "prefix": "/api/impersonation", "tags": ["Impersonation"]},
        {"module": "src.core._identity.routes_invitations", "prefix": "/api", "tags": ["Invitations"]},
        {"module": "src.core._identity.routes_backups", "prefix": "/api/backups", "tags": ["Backups"]},
        {"module": "src.core._identity.routes_commands", "prefix": "/api/commands", "tags": ["Commands"]},
    ],
)
