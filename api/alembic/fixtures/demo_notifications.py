"""Demo notification templates used by the seed script.

Each entry references an event index from the corresponding event list
(``admin_events``, ``alice_events``, etc.) and defines the notification
properties.
"""

# Notifications for admin — references indexes in ADMIN_EVENTS
ADMIN_NOTIFICATIONS = [
    # Unread
    {"event_idx": 0, "title": "Alice Martin s'est inscrit", "body": "Nouvel utilisateur enregistre sur la plateforme.", "is_read": False, "days_ago": 10},
    {"event_idx": 1, "title": "Bob Durand s'est inscrit", "body": None, "is_read": False, "days_ago": 8},
    {"event_idx": 2, "title": "Charlie Dupont s'est inscrit", "body": "Inscription via lien d'invitation.", "is_read": False, "days_ago": 6},
    {"event_idx": 8, "title": "Diane Leroy s'est inscrit", "body": None, "is_read": False, "days_ago": 0},
    # Read
    {"event_idx": 3, "title": "Alice Martin a mis a jour son profil", "body": None, "is_read": True, "read_days_ago": 4, "days_ago": 5},
    {"event_idx": 5, "title": "Bob Durand a mis a jour son profil", "body": "Changement d'adresse email.", "is_read": True, "read_days_ago": 2, "days_ago": 3},
    {"event_idx": 9, "title": "Charlie Dupont a mis a jour son profil", "body": None, "is_read": True, "read_days_ago": 0, "days_ago": 0},
    # Soft-deleted
    {"event_idx": 4, "title": "Nathan Provost a invite nouveau@example.com", "body": "Invitation envoyee par email.", "is_read": True, "read_days_ago": 3, "deleted_days_ago": 2, "days_ago": 4},
    {"event_idx": 6, "title": "Nathan Provost a desactive Charlie Dupont", "body": "Compte utilisateur desactive.", "is_read": False, "deleted_days_ago": 1, "days_ago": 2},
    {"event_idx": 7, "title": "Nathan Provost impersonifie Alice Martin", "body": None, "is_read": True, "read_days_ago": 0, "deleted_days_ago": 0, "days_ago": 1},
]

# Alice — references indexes in ALICE_EVENTS
ALICE_NOTIFICATIONS = [
    {"event_idx": 0, "title": "Bob Durand s'est inscrit", "body": "Nouveau membre dans votre equipe.", "is_read": False, "days_ago": 9},
    {"event_idx": 1, "title": "Nathan Provost a mis a jour son profil", "body": None, "is_read": False, "days_ago": 7},
    {"event_idx": 2, "title": "Vous avez ete invite par Nathan Provost", "body": "Verifiez vos parametres.", "is_read": True, "read_days_ago": 4, "days_ago": 5},
    {"event_idx": 3, "title": "Charlie Dupont s'est inscrit", "body": None, "is_read": True, "read_days_ago": 2, "days_ago": 3},
    {"event_idx": 4, "title": "Nathan Provost a desactive Bob Durand", "body": "Compte desactive.", "is_read": True, "read_days_ago": 0, "deleted_days_ago": 0, "days_ago": 1},
]

# Bob — references indexes in BOB_EVENTS
BOB_NOTIFICATIONS = [
    {"event_idx": 0, "title": "Alice Martin s'est inscrit", "body": None, "is_read": True, "read_days_ago": 10, "days_ago": 11},
    {"event_idx": 1, "title": "Charlie Dupont a mis a jour son profil", "body": None, "is_read": True, "read_days_ago": 7, "days_ago": 8},
    {"event_idx": 2, "title": "Vous avez ete invite par Nathan Provost", "body": "Bienvenue sur la plateforme.", "is_read": False, "days_ago": 6},
    {"event_idx": 3, "title": "Charlie Dupont s'est inscrit", "body": "Nouveau collegue.", "is_read": False, "days_ago": 4},
    {"event_idx": 4, "title": "Nathan Provost impersonifie votre compte", "body": None, "is_read": False, "days_ago": 2},
    {"event_idx": 5, "title": "Alice Martin a mis a jour son profil", "body": None, "is_read": True, "read_days_ago": 0, "deleted_days_ago": 0, "days_ago": 0},
]

# Charlie — references indexes in CHARLIE_EVENTS
CHARLIE_NOTIFICATIONS = [
    {"event_idx": 0, "title": "Alice Martin s'est inscrit", "body": None, "is_read": True, "read_days_ago": 11, "days_ago": 12},
    {"event_idx": 1, "title": "Bob Durand s'est inscrit", "body": "Nouveau membre.", "is_read": True, "read_days_ago": 9, "days_ago": 10},
    {"event_idx": 2, "title": "Nathan Provost a mis a jour son profil", "body": None, "is_read": False, "days_ago": 7},
    {"event_idx": 3, "title": "Vous avez ete invite par Nathan Provost", "body": None, "is_read": False, "days_ago": 4},
]
