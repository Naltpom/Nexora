"""User fixtures — system + demo accounts.

``SYSTEM_USERS`` are handled by the on_startup bootstrap (admin promotion).
``DEMO_USERS`` are inserted by the seed script with their role assignment.
"""

# System user — email resolved from settings.DEFAULT_ADMIN_EMAIL at runtime.
# Kept here as documentation of the expected bootstrap user.
SYSTEM_USERS = [
    {
        "email": "FROM_SETTINGS",  # resolved at runtime
        "role_slug": "super_admin",
    },
]

DEMO_USERS = [
    {
        "email": "alice@example.com",
        "password": "demo123",
        "first_name": "Alice",
        "last_name": "Martin",
        "auth_source": "local",
        "role_slug": "gestionnaire",
        "created_days_ago": 100,
    },
    {
        "email": "bob@example.com",
        "password": "demo123",
        "first_name": "Bob",
        "last_name": "Durand",
        "auth_source": "local",
        "role_slug": "moderateur",
        "created_days_ago": 80,
    },
    {
        "email": "charlie@example.com",
        "password": "demo123",
        "first_name": "Charlie",
        "last_name": "Dupont",
        "auth_source": "local",
        "role_slug": "user",
        "created_days_ago": 60,
    },
]
