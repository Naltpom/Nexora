"""Permission codes assigned to each role.

* **super_admin** receives ALL permissions automatically at startup
  (see ``on_startup`` step 2 in ``main.py``).  No explicit list needed here.
* **user** has no direct role_permissions \u2014 access comes from global_permissions.
"""

# ── Gestionnaire: gestion users, invitations, impersonation ──────────────
GESTIONNAIRE_PERMISSION_CODES: list[str] = [
    "users.read", "users.create", "users.update", "users.delete",
    "roles.read",
    "permissions.read",
    "invitations.create", "invitations.read", "invitations.delete",
    "impersonation.start", "impersonation.read",
    "search.global",
]

# ── Mod\u00e9rateur: r\u00e8gles de notification, webhooks globaux ─────────────────
MODERATEUR_PERMISSION_CODES: list[str] = [
    "notification.admin",
    "notification.rules.create", "notification.rules.update", "notification.rules.delete",
    "notification.email.resend",
    "notification.webhook.global.read", "notification.webhook.global.create",
    "notification.webhook.global.update", "notification.webhook.global.delete",
    "features.read",
    "settings.read",
]

# ── DPO: RGPD, conformit\u00e9, audit ─────────────────────────────────────────
DPO_PERMISSION_CODES: list[str] = [
    "users.read",
    "roles.read",
    "permissions.read",
    "rgpd.consentement.manage",
    "rgpd.registre.read", "rgpd.registre.manage",
    "rgpd.droits.manage",
    "rgpd.politique.manage",
    "rgpd.audit.read",
    "mfa.manage",  # mfa.bypass is user-only (assigned per-user, never via role)
    "search.global",
]

# ── Op\u00e9rateur: backups, commandes, features, settings ─────────────────────
OPERATEUR_PERMISSION_CODES: list[str] = [
    "features.read", "features.manage",
    "settings.read", "settings.manage",
    "commands.read", "commands.manage",
    "backups.create", "backups.restore", "backups.read",
    "search.global",
]

# Mapping slug \u2192 permission codes (for seed.py)
ROLE_PERMISSION_MAP: dict[str, list[str]] = {
    "gestionnaire": GESTIONNAIRE_PERMISSION_CODES,
    "moderateur": MODERATEUR_PERMISSION_CODES,
    "dpo": DPO_PERMISSION_CODES,
    "operateur": OPERATEUR_PERMISSION_CODES,
    # super_admin: all (auto at startup)
    # user: none (global_permissions only)
}
