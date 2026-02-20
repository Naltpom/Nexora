from ...core.feature_registry import FeatureManifest
from .middleware import ImpersonationAuditMiddleware, LastActiveMiddleware

manifest = FeatureManifest(
    name="_core",
    label="Core",
    description="Authentication, users, roles, permissions, feature management",
    version="2026.02.1",
    is_core=True,
    permissions=[
        "users.read", "users.create", "users.update", "users.delete",
        "roles.read", "roles.create", "roles.update", "roles.delete",
        "permissions.read", "permissions.manage",
        "features.read", "features.manage",
        "settings.read", "settings.manage",
        "invitations.create", "invitations.read",
        "impersonation.start", "impersonation.read",
        "backups.create", "backups.restore", "backups.read",
        "search.global",
    ],
    middleware=[ImpersonationAuditMiddleware, LastActiveMiddleware],
    extra_routers=[
        {"module": "src.features._core.routes_auth", "prefix": "/api/auth", "tags": ["Auth"]},
        {"module": "src.features._core.routes_users", "prefix": "/api/users", "tags": ["Users"]},
        {"module": "src.features._core.routes_roles", "prefix": "/api/roles", "tags": ["Roles"]},
        {"module": "src.features._core.routes_permissions", "prefix": "/api/permissions", "tags": ["Permissions"]},
        {"module": "src.features._core.routes_features", "prefix": "/api/features", "tags": ["Features"]},
        {"module": "src.features._core.routes_settings", "prefix": "/api/settings", "tags": ["Settings"]},
        {"module": "src.features._core.routes_health", "prefix": "/api", "tags": ["Health"]},
        {"module": "src.features._core.routes_search", "prefix": "/api", "tags": ["Search"]},
        {"module": "src.features._core.routes_impersonation", "prefix": "/api/impersonation", "tags": ["Impersonation"]},
        {"module": "src.features._core.routes_invitations", "prefix": "/api", "tags": ["Invitations"]},
        {"module": "src.features._core.routes_backups", "prefix": "/api/backups", "tags": ["Backups"]},
    ],
)
