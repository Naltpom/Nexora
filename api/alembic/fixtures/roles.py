"""Default roles created by the seed script.

Note: ``super_admin`` is NOT listed here \u2014 it is created by the Alembic
bootstrap migration (``h1i2j3k4l5m6``).  The roles below are application-
level roles inserted during seeding.
"""

ROLES = [
    {
        "slug": "gestionnaire",
        "name": "Gestionnaire",
        "description": "Gestion des utilisateurs, invitations et impersonation",
    },
    {
        "slug": "moderateur",
        "name": "Mod\u00e9rateur",
        "description": "Gestion des r\u00e8gles de notification et webhooks globaux",
    },
    {
        "slug": "dpo",
        "name": "DPO",
        "description": "D\u00e9l\u00e9gu\u00e9 \u00e0 la protection des donn\u00e9es \u2014 RGPD, conformit\u00e9, audit",
    },
    {
        "slug": "operateur",
        "name": "Op\u00e9rateur",
        "description": "Maintenance syst\u00e8me \u2014 sauvegardes, commandes, features, settings",
    },
    {
        "slug": "user",
        "name": "Utilisateur",
        "description": "Utilisateur standard \u2014 permissions de base",
    },
]
