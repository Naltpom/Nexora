"""Feature discovery, validation, and loading system."""

from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Any

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)

CORE_FEATURES_DIR = Path(__file__).resolve().parent          # api/src/core/ (template features)
PROJECT_FEATURES_DIR = Path(__file__).resolve().parent.parent / "features"  # api/src/features/ (project features)


@dataclass
class FeatureManifest:
    """Declaration of a feature's metadata and capabilities."""

    name: str
    label: str
    description: str = ""
    version: str = "1.0.0"

    # Hierarchy
    parent: str | None = None
    children: list[str] = field(default_factory=list)

    # Dependencies (sister features)
    depends: list[str] = field(default_factory=list)

    # Permissions this feature provides
    permissions: list[str] = field(default_factory=list)

    # Events this feature emits (for discovery by other features)
    # Each dict: {"event_type": "user.registered", "label": "...", "category": "...", "description": "...", "admin_only": False}
    events: list[dict[str, Any]] = field(default_factory=list)

    # Required config keys
    config_keys: list[str] = field(default_factory=list)

    # Router registration
    router_module: str | None = None
    router_prefix: str | None = None
    router_tags: list[str] = field(default_factory=list)

    # Additional routers (for core which has multiple route files)
    extra_routers: list[dict[str, Any]] = field(default_factory=list)

    # Middleware classes to register
    middleware: list[Any] = field(default_factory=list)

    # Lifecycle hooks
    on_startup: Callable | None = None
    on_shutdown: Callable | None = None

    # Core features cannot be disabled
    is_core: bool = False


_registry_instance: "FeatureRegistry | None" = None


def get_registry() -> "FeatureRegistry | None":
    """Return the global FeatureRegistry singleton (available after startup)."""
    return _registry_instance


class FeatureRegistry:
    """Discovers, validates, and loads features at startup."""

    def __init__(self):
        global _registry_instance
        self._manifests: dict[str, FeatureManifest] = {}
        self._states: dict[str, bool] = {}
        _registry_instance = self

    @property
    def manifests(self) -> dict[str, FeatureManifest]:
        return self._manifests

    def discover(self):
        """Scan feature directories for manifest.py files and import them."""
        for base_dir in [CORE_FEATURES_DIR, PROJECT_FEATURES_DIR]:
            if not base_dir.exists():
                continue
            for manifest_path in base_dir.rglob("manifest.py"):
                package_dir = manifest_path.parent
                # Build module path: src.core.xxx.manifest or src.features.xxx.manifest
                rel = manifest_path.relative_to(Path(__file__).resolve().parent.parent)
                module_name = "src." + str(rel.with_suffix("")).replace("\\", ".").replace("/", ".")
                try:
                    module = importlib.import_module(module_name)
                    manifest: FeatureManifest = module.manifest
                    self._manifests[manifest.name] = manifest
                    logger.info(f"Discovered feature: {manifest.name} ({manifest.label})")
                except Exception as e:
                    logger.error(f"Failed to load manifest from {manifest_path}: {e}")

    def load_states(self, db_states: dict[str, bool]):
        """Load feature active/inactive states. Core features are always active."""
        for name, manifest in self._manifests.items():
            if manifest.is_core:
                self._states[name] = True
            else:
                self._states[name] = db_states.get(name, True)

    def validate(self):
        """Validate the dependency graph. Raises on invalid state."""
        for name, manifest in self._manifests.items():
            if not self.is_active(name):
                continue

            # Check parent is active
            if manifest.parent and not self.is_active(manifest.parent):
                logger.warning(
                    f"Feature '{name}' requires parent '{manifest.parent}' which is inactive. "
                    f"Deactivating '{name}'."
                )
                self._states[name] = False

            # Check dependencies are active
            for dep in manifest.depends:
                if dep not in self._manifests:
                    logger.warning(f"Feature '{name}' depends on unknown feature '{dep}'.")
                elif not self.is_active(dep):
                    logger.warning(
                        f"Feature '{name}' requires '{dep}' which is inactive. "
                        f"Deactivating '{name}'."
                    )
                    self._states[name] = False

    def is_active(self, feature_name: str) -> bool:
        return self._states.get(feature_name, False)

    def get_all_manifests(self) -> list[FeatureManifest]:
        return list(self._manifests.values())

    def get_active_manifests(self) -> list[FeatureManifest]:
        return [m for m in self._manifests.values() if self.is_active(m.name)]

    def register_routes(self, app: FastAPI, *, dev_mode: bool = False):
        """Register feature routers on the FastAPI app."""
        for manifest in self._manifests.values():
            routers_to_register = []

            # Main router
            if manifest.router_module:
                routers_to_register.append({
                    "module": manifest.router_module,
                    "prefix": manifest.router_prefix or "",
                    "tags": manifest.router_tags,
                })

            # Extra routers (core has multiple route files)
            for extra in manifest.extra_routers:
                routers_to_register.append(extra)

            for router_info in routers_to_register:
                if not dev_mode and not self.is_active(manifest.name):
                    continue

                try:
                    module = importlib.import_module(router_info["module"])
                    router: APIRouter = module.router

                    if dev_mode and not self.is_active(manifest.name):
                        # Wrap with feature gate that returns 503
                        gated_router = self._create_gated_router(router, router_info, manifest.name)
                        app.include_router(gated_router)
                    else:
                        app.include_router(
                            router,
                            prefix=router_info.get("prefix", ""),
                            tags=router_info.get("tags", []),
                        )
                except Exception as e:
                    logger.error(f"Failed to register router for feature '{manifest.name}': {e}")

    def register_middleware(self, app: FastAPI):
        """Register middleware from active features."""
        for manifest in self.get_active_manifests():
            for mw_class in manifest.middleware:
                app.add_middleware(mw_class)

    def _create_gated_router(self, original: APIRouter, info: dict, feature_name: str) -> APIRouter:
        """Create a router that returns 503 for disabled features in dev mode."""
        gated = APIRouter(prefix=info.get("prefix", ""), tags=info.get("tags", []))

        for route in original.routes:
            path = getattr(route, "path", "")
            methods = getattr(route, "methods", {"GET"})

            async def gated_endpoint(fname=feature_name):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Feature '{fname}' is disabled",
                )

            for method in methods:
                gated.add_api_route(path, gated_endpoint, methods=[method])

        return gated

    def can_toggle(self, feature_name: str, activate: bool) -> tuple[bool, str]:
        """Check if a feature can be toggled. Returns (ok, reason)."""
        manifest = self._manifests.get(feature_name)
        if not manifest:
            return False, f"Feature '{feature_name}' not found"

        if manifest.is_core:
            return False, "Core features cannot be toggled"

        if activate:
            # Check parent is active
            if manifest.parent and not self.is_active(manifest.parent):
                return False, f"Parent feature '{manifest.parent}' must be active first"
            # Check dependencies
            for dep in manifest.depends:
                if not self.is_active(dep):
                    return False, f"Dependency '{dep}' must be active first"
        # Deactivation is always allowed — children/dependants are cascaded

        return True, ""

    def get_cascade_deactivations(self, feature_name: str) -> list[str]:
        """Return list of active features that must be deactivated when *feature_name* is turned off.

        Includes children and features that depend on *feature_name*, recursively.
        """
        to_deactivate: list[str] = []
        visited: set[str] = set()

        def _collect(name: str):
            for fname, m in self._manifests.items():
                if fname in visited or not self.is_active(fname):
                    continue
                if m.parent == name or name in m.depends:
                    visited.add(fname)
                    _collect(fname)
                    to_deactivate.append(fname)

        _collect(feature_name)
        return to_deactivate

    def toggle(self, feature_name: str, active: bool):
        """Toggle feature state in memory."""
        self._states[feature_name] = active

    _ACTION_DESCRIPTIONS: dict[str, str] = {
        "read": "Consulter",
        "create": "Creer",
        "update": "Modifier",
        "delete": "Supprimer",
        "manage": "Gerer",
        "send": "Envoyer",
        "export": "Exporter",
        "import": "Importer",
    }

    def collect_all_permissions(self) -> list[dict]:
        """Gather all permissions from all manifests."""
        perms = []
        for manifest in self._manifests.values():
            for perm_code in manifest.permissions:
                parts = perm_code.split(".")
                action = parts[-1] if len(parts) > 1 else parts[0]
                resource = ".".join(parts[:-1]) if len(parts) > 1 else manifest.name
                resource_label = resource.replace(".", " ").replace("_", " ").title()
                action_label = self._ACTION_DESCRIPTIONS.get(action, action.replace("_", " ").title())
                perms.append({
                    "code": perm_code,
                    "feature": manifest.name,
                    "label": perm_code.replace(".", " ").replace("_", " ").title(),
                    "description": f"{action_label} les {resource_label.lower()}",
                })
        return perms

    def collect_all_events(self, *, include_inactive: bool = False) -> list[dict]:
        """Gather all event declarations from active feature manifests."""
        events = []
        for manifest in self._manifests.values():
            if not include_inactive and not self.is_active(manifest.name):
                continue
            for evt in manifest.events:
                events.append({**evt, "feature": manifest.name})
        return events

    def get_manifest_data_for_frontend(self) -> list[dict]:
        """Return feature data for the frontend manifest endpoint."""
        result = []
        for name, manifest in self._manifests.items():
            result.append({
                "name": manifest.name,
                "label": manifest.label,
                "description": manifest.description,
                "version": manifest.version,
                "parent": manifest.parent,
                "children": manifest.children,
                "depends": manifest.depends,
                "permissions": manifest.permissions,
                "is_core": manifest.is_core,
                "active": self.is_active(name),
                "has_routes": manifest.router_module is not None or len(manifest.extra_routers) > 0,
            })
        return result
