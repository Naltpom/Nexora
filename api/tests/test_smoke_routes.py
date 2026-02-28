"""Smoke tests: every registered API route must respond without a 500 error.

Tests run against the live API server (localhost:8000) inside the Docker container.
Routes are auto-discovered from the FastAPI app's registered routes.
"""

import re

import pytest
from fastapi.routing import APIRoute

from src.main import create_app

# ---------------------------------------------------------------------------
# Route introspection helpers
# ---------------------------------------------------------------------------

_PARAM_DEFAULTS = {
    "uuid": "00000000-0000-0000-0000-000000000000",
    "user_uuid": "00000000-0000-0000-0000-000000000000",
    "provider": "google",
    "token": "test-smoke-token",
    "slug": "test-slug",
    "name": "test_name",
}

# Routes to skip (SSE long-lived connections, etc.)
_SKIP_PATHS = {
    "/api/realtime/stream",
}

# Methods to skip
_SKIP_METHODS = {"OPTIONS", "HEAD"}


def _fill_path_params(path: str) -> str:
    """Replace {param} placeholders with plausible dummy values."""
    def _replace(match):
        param = match.group(1)
        if param in _PARAM_DEFAULTS:
            return _PARAM_DEFAULTS[param]
        if "id" in param.lower():
            return "999999"
        return "test"
    return re.sub(r"\{(\w+)\}", _replace, path)


def _route_needs_auth(route: APIRoute) -> bool:
    """Heuristic: check if the route's dependency chain requires authentication."""
    deps_repr = repr(route.dependant.dependencies)
    return "get_current_user" in deps_repr or "require_permission" in deps_repr


def _collect_routes():
    """Build the list of all API routes from the FastAPI app."""
    app = create_app()
    public, protected = [], []

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path in _SKIP_PATHS:
            continue
        for method in route.methods:
            if method in _SKIP_METHODS:
                continue
            entry = {
                "method": method,
                "path": route.path,
                "concrete_path": _fill_path_params(route.path),
                "name": route.name or "unknown",
            }
            if _route_needs_auth(route):
                protected.append(entry)
            else:
                public.append(entry)

    return public, protected


PUBLIC_ROUTES, PROTECTED_ROUTES = _collect_routes()


def _route_id(route: dict) -> str:
    return f"{route['method']} {route['path']}"


# ---------------------------------------------------------------------------
# Request helper
# ---------------------------------------------------------------------------

def _send(client, route: dict):
    """Send a request matching the route's method."""
    method = route["method"].lower()
    path = route["concrete_path"]
    kwargs = {}
    if method in ("post", "put", "patch"):
        kwargs["json"] = {}
    return getattr(client, method)(path, **kwargs)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("route", PUBLIC_ROUTES, ids=_route_id)
def test_public_route_no_500(client, route):
    """Public routes must not return 500."""
    response = _send(client, route)
    assert response.status_code != 500, (
        f"{route['method']} {route['path']} returned 500:\n{response.text[:500]}"
    )


@pytest.mark.parametrize("route", PROTECTED_ROUTES, ids=_route_id)
def test_protected_route_no_500(auth_client, route):
    """Protected routes must not return 500 when called with super_admin auth."""
    response = _send(auth_client, route)
    assert response.status_code != 500, (
        f"{route['method']} {route['path']} returned 500:\n{response.text[:500]}"
    )
