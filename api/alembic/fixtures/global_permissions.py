"""Permission codes granted to every authenticated user (global_permissions table)."""

GLOBAL_PERMISSION_CODES: list[str] = [
    # Lecture
    "notification.read", "event.read", "i18n.read", "search.global",
    "preference.read", "preference.theme.read", "preference.couleur.read",
    "preference.langue.read", "preference.font.read", "preference.layout.read",
    "preference.accessibilite.read", "preference.composants.read",
    "preference.didacticiel.read",
    "rgpd.read", "rgpd.consentement.read", "rgpd.droits.read",
    "rgpd.export.read", "rgpd.politique.read",
    "storybook.read",
    # Personnel
    "notification.delete", "notification.rules.read",
    "notification.push.subscribe", "notification.push.read",
    "notification.webhook.read", "notification.webhook.create",
    "notification.webhook.update", "notification.webhook.delete",
    "notification.webhook.test",
    # Auth / MFA / SSO
    "mfa.setup", "mfa.totp.setup", "mfa.email.setup",
    "sso.link", "sso.google.login", "sso.github.login",
]
