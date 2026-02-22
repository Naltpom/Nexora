"""Default feature states (read from env where applicable)."""

import os

FEATURE_STATES = [
    {"name": "notification", "is_active": True},
    {"name": "notification.email", "is_active": True},
    {"name": "notification.push", "is_active": os.environ.get("PUSH_ENABLED", "false").lower() == "true"},
    {"name": "notification.webhook", "is_active": True},
]
