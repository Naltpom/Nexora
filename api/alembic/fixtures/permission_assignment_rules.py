"""Assignment rules for permissions that differ from the default.

Default: {"user": True, "role": True, "global": True} (all assignment vectors allowed).
Only list permissions that need restrictions here.
Applied at startup via sync_permissions_from_registry().
"""

PERMISSION_ASSIGNMENT_RULES: dict[str, dict[str, bool]] = {
    "mfa.bypass": {"user": True, "role": False, "global": False},
}
