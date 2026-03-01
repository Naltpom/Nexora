"""CLI runner for mass fixture generation.

Usage (inside Docker container)::

    python -m src.run_fixtures
    python -m src.run_fixtures --scale 500
    python -m src.run_fixtures --list
    python -m src.run_fixtures --dry-run

Examples::

    python -m src.run_fixtures --scale 100          # Generate ~100 of each entity
    python -m src.run_fixtures --scale 1000         # Stress test volume
    python -m src.run_fixtures --list               # Show discovered fixtures
    python -m src.run_fixtures --dry-run --scale 50  # Preview without inserting
"""

import argparse
import asyncio
import importlib
import logging
import sys
from pathlib import Path

from .core.database import async_session
from .core.fixture_registry import CORE_FEATURES_DIR, PROJECT_FEATURES_DIR, FixtureRegistry

logger = logging.getLogger(__name__)


def _import_all_models():
    """Import all models from all features so ORM relationships resolve correctly."""
    for base_dir in [CORE_FEATURES_DIR, PROJECT_FEATURES_DIR]:
        if not base_dir.exists():
            continue
        for models_path in base_dir.rglob("models.py"):
            rel = models_path.relative_to(Path(__file__).resolve().parent)
            module_name = "src." + str(rel.with_suffix("")).replace("\\", ".").replace("/", ".")
            try:
                importlib.import_module(module_name)
            except Exception as e:
                logger.warning("Could not import models from %s: %s", module_name, e)


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")

    parser = argparse.ArgumentParser(description="Generate mass fixture data for all features")
    parser.add_argument(
        "--scale", type=int, default=100,
        help="Number of items to generate per entity (default: 100)",
    )
    parser.add_argument("--list", action="store_true", help="List all discovered fixture generators")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be generated without inserting")
    args = parser.parse_args()

    _import_all_models()

    registry = FixtureRegistry()
    registry.discover()

    if args.list:
        fixtures = registry.fixtures
        if not fixtures:
            print("No fixtures found.")
            return
        try:
            ordered = registry.resolve_order()
        except ValueError as e:
            print(f"Error resolving order: {e}")
            sys.exit(1)

        print(f"\nDiscovered fixtures ({len(ordered)}) in execution order:\n")
        for i, fix in enumerate(ordered, 1):
            deps = ", ".join(fix.depends) if fix.depends else "(none)"
            print(f"  {i}. {fix.name:<30} {fix.label}")
            if fix.description:
                print(f"     {fix.description}")
            print(f"     depends: {deps}")
            if fix.check_table:
                print(f"     idempotency: {fix.check_table} >= {fix.check_min_rows} rows")
            print()
        return

    asyncio.run(_execute(registry, args.scale, args.dry_run))


async def _execute(registry: FixtureRegistry, scale: int, dry_run: bool):
    prefix = "DRY RUN - " if dry_run else ""
    print(f"\n{prefix}Generating fixtures (scale={scale})...\n")

    results = await registry.run_all(async_session, scale=scale, dry_run=dry_run)

    print()
    print("=" * 60)
    print("  Fixture generation complete")
    print("=" * 60)

    status_icon = {"success": "+", "skipped": "-", "dry_run": "~", "error": "!"}
    for r in results:
        icon = status_icon.get(r["status"], "?")
        print(f"  [{icon}] {r['fixture']:<30} {r['status']}")
        if r.get("result"):
            for k, v in r["result"].items():
                print(f"       {k}: {v}")
        if r.get("reason"):
            print(f"       {r['reason']}")
        if r.get("error"):
            print(f"       ERROR: {r['error']}")
    print()


if __name__ == "__main__":
    main()
