"""Demo event templates used by the seed script.

Each entry defines an event relative to the demo users.  The ``actor`` and
``resource`` keys reference user aliases ("admin", "alice", "bob", "charlie")
that the seed script resolves to actual user IDs.
"""

# Events for the admin user's notifications
ADMIN_EVENTS = [
    {
        "event_type": "user.registered",
        "actor": "alice", "resource_type": "user", "resource": "alice",
        "payload": {"actor_name": "Alice Martin", "user_name": "Alice Martin", "email": "alice@example.com"},
        "days_ago": 10,
    },
    {
        "event_type": "user.registered",
        "actor": "bob", "resource_type": "user", "resource": "bob",
        "payload": {"actor_name": "Bob Durand", "user_name": "Bob Durand", "email": "bob@example.com"},
        "days_ago": 8,
    },
    {
        "event_type": "user.registered",
        "actor": "charlie", "resource_type": "user", "resource": "charlie",
        "payload": {"actor_name": "Charlie Dupont", "user_name": "Charlie Dupont", "email": "charlie@example.com"},
        "days_ago": 6,
    },
    {
        "event_type": "user.updated",
        "actor": "alice", "resource_type": "user", "resource": "alice",
        "payload": {"actor_name": "Alice Martin"},
        "days_ago": 5,
    },
    {
        "event_type": "user.invited",
        "actor": "admin", "resource_type": "user", "resource": "bob",
        "payload": {"actor_name": "Nathan Provost", "invited_email": "nouveau@example.com"},
        "days_ago": 4,
    },
    {
        "event_type": "user.updated",
        "actor": "bob", "resource_type": "user", "resource": "bob",
        "payload": {"actor_name": "Bob Durand"},
        "days_ago": 3,
    },
    {
        "event_type": "user.deactivated",
        "actor": "admin", "resource_type": "user", "resource": "charlie",
        "payload": {"actor_name": "Nathan Provost", "target_name": "Charlie Dupont"},
        "days_ago": 2,
    },
    {
        "event_type": "admin.impersonation_started",
        "actor": "admin", "resource_type": "user", "resource": "alice",
        "payload": {"actor_name": "Nathan Provost", "target_name": "Alice Martin"},
        "days_ago": 1,
    },
    {
        "event_type": "user.registered",
        "actor": "alice", "resource_type": "user", "resource": "alice",
        "payload": {"actor_name": "Alice Martin", "user_name": "Diane Leroy", "email": "diane@example.com"},
        "days_ago": 0,
    },
    {
        "event_type": "user.updated",
        "actor": "charlie", "resource_type": "user", "resource": "charlie",
        "payload": {"actor_name": "Charlie Dupont"},
        "days_ago": 0,
    },
]

# Extra events for alice / bob / charlie notifications
ALICE_EVENTS = [
    {"event_type": "user.registered", "actor": "bob", "resource_type": "user", "resource": "bob", "payload": {"actor_name": "Bob Durand", "user_name": "Bob Durand"}, "days_ago": 9},
    {"event_type": "user.updated", "actor": "admin", "resource_type": "user", "resource": "admin", "payload": {"actor_name": "Nathan Provost"}, "days_ago": 7},
    {"event_type": "user.invited", "actor": "admin", "resource_type": "user", "resource": "alice", "payload": {"actor_name": "Nathan Provost", "invited_email": "alice@example.com"}, "days_ago": 5},
    {"event_type": "user.registered", "actor": "charlie", "resource_type": "user", "resource": "charlie", "payload": {"actor_name": "Charlie Dupont", "user_name": "Charlie Dupont"}, "days_ago": 3},
    {"event_type": "user.deactivated", "actor": "admin", "resource_type": "user", "resource": "bob", "payload": {"actor_name": "Nathan Provost", "target_name": "Bob Durand"}, "days_ago": 1},
]

BOB_EVENTS = [
    {"event_type": "user.registered", "actor": "alice", "resource_type": "user", "resource": "alice", "payload": {"actor_name": "Alice Martin", "user_name": "Alice Martin"}, "days_ago": 11},
    {"event_type": "user.updated", "actor": "charlie", "resource_type": "user", "resource": "charlie", "payload": {"actor_name": "Charlie Dupont"}, "days_ago": 8},
    {"event_type": "user.invited", "actor": "admin", "resource_type": "user", "resource": "bob", "payload": {"actor_name": "Nathan Provost", "invited_email": "bob@example.com"}, "days_ago": 6},
    {"event_type": "user.registered", "actor": "charlie", "resource_type": "user", "resource": "charlie", "payload": {"actor_name": "Charlie Dupont", "user_name": "Charlie Dupont"}, "days_ago": 4},
    {"event_type": "admin.impersonation_started", "actor": "admin", "resource_type": "user", "resource": "bob", "payload": {"actor_name": "Nathan Provost", "target_name": "Bob Durand"}, "days_ago": 2},
    {"event_type": "user.updated", "actor": "alice", "resource_type": "user", "resource": "alice", "payload": {"actor_name": "Alice Martin"}, "days_ago": 0},
]

CHARLIE_EVENTS = [
    {"event_type": "user.registered", "actor": "alice", "resource_type": "user", "resource": "alice", "payload": {"actor_name": "Alice Martin", "user_name": "Alice Martin"}, "days_ago": 12},
    {"event_type": "user.registered", "actor": "bob", "resource_type": "user", "resource": "bob", "payload": {"actor_name": "Bob Durand", "user_name": "Bob Durand"}, "days_ago": 10},
    {"event_type": "user.updated", "actor": "admin", "resource_type": "user", "resource": "admin", "payload": {"actor_name": "Nathan Provost"}, "days_ago": 7},
    {"event_type": "user.invited", "actor": "admin", "resource_type": "user", "resource": "charlie", "payload": {"actor_name": "Nathan Provost", "invited_email": "charlie@example.com"}, "days_ago": 4},
]
