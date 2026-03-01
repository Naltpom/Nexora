"""Fixture discovery and mass data generation system.

Follows the same decentralized pattern as ``FeatureRegistry`` (manifest.py)
and ``CommandRegistry`` (commands.py).  Each feature provides a ``fixtures.py``
that exports a ``fixtures`` list of :class:`FixtureDefinition`.  The registry
discovers them, resolves dependencies via topological sort, and runs them in
order.

Usage (inside Docker)::

    python -m src.run_fixtures --scale 200
    python -m src.run_fixtures --list
"""

from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

CORE_FEATURES_DIR = Path(__file__).resolve().parent                       # api/src/core/
PROJECT_FEATURES_DIR = Path(__file__).resolve().parent.parent / "features"  # api/src/features/


# ---------------------------------------------------------------------------
# Shared context bag
# ---------------------------------------------------------------------------

class FixtureContext:
    """Shared context passed between fixture generators.

    Upstream fixtures (e.g. ``_identity``) store generated object IDs that
    downstream fixtures (``event``, ``notification``) consume.
    """

    def __init__(self, scale: int = 100):
        self.scale = scale
        self._data: dict[str, Any] = {}

    def set(self, key: str, value: Any) -> None:
        """Store a value.  Convention: ``'feature.key'``."""
        self._data[key] = value

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    @property
    def user_ids(self) -> list[int]:
        """Shortcut for the most commonly needed shared data."""
        return self._data.get("_identity.user_ids", [])

    @property
    def admin_id(self) -> int | None:
        return self._data.get("_identity.admin_id")


# ---------------------------------------------------------------------------
# Fixture definition
# ---------------------------------------------------------------------------

@dataclass
class FixtureDefinition:
    """Declaration of a feature's mass fixture generator."""

    name: str
    label: str
    description: str = ""
    feature: str = ""

    depends: list[str] = field(default_factory=list)

    handler: Callable[[AsyncSession, FixtureContext], Awaitable[dict[str, Any]]] | None = None

    # Called when fixture is skipped (idempotency) so it can still populate context
    populate_context: Callable[[AsyncSession, FixtureContext], Awaitable[None]] | None = None

    check_table: str | None = None
    check_min_rows: int = 10


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

_fixture_registry_instance: FixtureRegistry | None = None


def get_fixture_registry() -> FixtureRegistry | None:
    """Return the global ``FixtureRegistry`` singleton (available after discover)."""
    return _fixture_registry_instance


class FixtureRegistry:
    """Discovers fixture generators from feature directories and runs them in dependency order."""

    def __init__(self) -> None:
        global _fixture_registry_instance
        self._fixtures: dict[str, FixtureDefinition] = {}
        _fixture_registry_instance = self

    @property
    def fixtures(self) -> dict[str, FixtureDefinition]:
        return self._fixtures

    # -- Discovery -----------------------------------------------------------

    def discover(self) -> None:
        """Scan feature directories for ``fixtures.py`` and import them."""
        for base_dir in [CORE_FEATURES_DIR, PROJECT_FEATURES_DIR]:
            if not base_dir.exists():
                continue
            for fixtures_path in base_dir.rglob("fixtures.py"):
                rel = fixtures_path.relative_to(Path(__file__).resolve().parent.parent)
                module_name = "src." + str(rel.with_suffix("")).replace("\\", ".").replace("/", ".")

                feature_dir = fixtures_path.parent
                feature_rel = feature_dir.relative_to(base_dir)
                feature_name = str(feature_rel).replace("\\", ".").replace("/", ".")

                try:
                    module = importlib.import_module(module_name)
                    fixture_list: list[FixtureDefinition] = module.fixtures
                    for fix in fixture_list:
                        fix.feature = fix.feature or feature_name
                        if fix.name in self._fixtures:
                            logger.warning(
                                "Duplicate fixture name '%s' from %s, "
                                "overwriting previous from feature '%s'",
                                fix.name, fixtures_path, self._fixtures[fix.name].feature,
                            )
                        self._fixtures[fix.name] = fix
                        logger.info("Discovered fixture: %s (%s)", fix.name, fix.label)
                except Exception as e:
                    logger.error("Failed to load fixtures from %s: %s", fixtures_path, e)

    # -- Dependency resolution -----------------------------------------------

    def resolve_order(self) -> list[FixtureDefinition]:
        """Topological sort (Kahn) of fixtures by ``depends``.

        Raises :class:`ValueError` on circular dependencies.
        """
        in_degree: dict[str, int] = {name: 0 for name in self._fixtures}
        adjacency: dict[str, list[str]] = {name: [] for name in self._fixtures}

        for name, fix in self._fixtures.items():
            for dep in fix.depends:
                if dep not in self._fixtures:
                    logger.warning(
                        "Fixture '%s' depends on unknown fixture '%s', skipping dependency",
                        name, dep,
                    )
                    continue
                adjacency[dep].append(name)
                in_degree[name] += 1

        queue = sorted(name for name, deg in in_degree.items() if deg == 0)
        order: list[str] = []

        while queue:
            current = queue.pop(0)
            order.append(current)
            for neighbor in sorted(adjacency[current]):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
            queue.sort()

        if len(order) != len(self._fixtures):
            remaining = set(self._fixtures.keys()) - set(order)
            raise ValueError(f"Circular dependency detected among fixtures: {remaining}")

        return [self._fixtures[name] for name in order]

    # -- Execution -----------------------------------------------------------

    async def run_all(
        self,
        session_factory,
        *,
        scale: int = 100,
        dry_run: bool = False,
    ) -> list[dict[str, Any]]:
        """Run all fixture generators in dependency order.

        Parameters
        ----------
        session_factory:
            ``async_sessionmaker`` for creating DB sessions.
        scale:
            Number of items to generate (passed to ``FixtureContext``).
        dry_run:
            If ``True``, log what would be generated but don't commit.
        """
        from sqlalchemy import func, select, text

        ordered = self.resolve_order()
        ctx = FixtureContext(scale=scale)
        results: list[dict[str, Any]] = []

        for fix in ordered:
            # Idempotency check
            if fix.check_table:
                async with session_factory() as db:
                    row_count = await db.scalar(
                        select(func.count()).select_from(text(fix.check_table))
                    )
                    if row_count and row_count >= fix.check_min_rows:
                        msg = (
                            f"table '{fix.check_table}' already has {row_count} rows "
                            f"(threshold: {fix.check_min_rows})"
                        )
                        logger.info("Skipping '%s': %s", fix.name, msg)
                        # Populate context even when skipped (for downstream fixtures)
                        if fix.populate_context:
                            try:
                                await fix.populate_context(db, ctx)
                            except Exception as e:
                                logger.warning("populate_context for '%s' failed: %s", fix.name, e)
                        results.append({"fixture": fix.name, "status": "skipped", "reason": msg})
                        continue

            if not fix.handler:
                logger.warning("Fixture '%s' has no handler, skipping", fix.name)
                continue

            if dry_run:
                results.append({"fixture": fix.name, "status": "dry_run", "scale": scale})
                continue

            logger.info("Running fixture: %s (%s) [scale=%d]", fix.name, fix.label, scale)

            async with session_factory() as db:
                try:
                    result = await fix.handler(db, ctx)
                    await db.commit()
                    results.append({"fixture": fix.name, "status": "success", "result": result})
                    logger.info("Fixture '%s' completed: %s", fix.name, result)
                except Exception as e:
                    await db.rollback()
                    logger.error("Fixture '%s' failed: %s", fix.name, e)
                    results.append({"fixture": fix.name, "status": "error", "error": str(e)})
                    raise

        return results
