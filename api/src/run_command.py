"""CLI runner for feature maintenance commands.

Usage (inside Docker container):
    python -m src.run_command <command_name>
    python -m src.run_command --list

Examples:
    python -m src.run_command notification.purge_deleted
    python -m src.run_command --list
"""

import argparse
import asyncio
import importlib
import logging
import sys
from pathlib import Path

from .core.database import async_session
from .core.command_registry import CommandRegistry, CORE_FEATURES_DIR, PROJECT_FEATURES_DIR

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
                logger.warning(f"Could not import models from {module_name}: {e}")


def main():
    parser = argparse.ArgumentParser(description="Run a feature maintenance command")
    parser.add_argument("command", nargs="?", help="Command name to execute (e.g. notification.purge_deleted)")
    parser.add_argument("--list", action="store_true", help="List all available commands")
    args = parser.parse_args()

    _import_all_models()

    registry = CommandRegistry()
    registry.discover()

    if args.list:
        commands = registry.get_all_commands()
        if not commands:
            print("No commands found.")
            return
        print(f"\nAvailable commands ({len(commands)}):\n")
        for cmd in commands:
            state = "enabled" if cmd.enabled else "DISABLED"
            print(f"  {cmd.name:<40} [{state}]")
            print(f"    {cmd.label}")
            if cmd.description:
                print(f"    {cmd.description}")
            if cmd.schedule:
                print(f"    schedule: {cmd.schedule}")
            if cmd.config_keys:
                print(f"    config: {', '.join(cmd.config_keys)}")
            print()
        return

    if not args.command:
        parser.print_help()
        sys.exit(1)

    cmd = registry.get_command(args.command)
    if not cmd:
        print(f"Error: Command '{args.command}' not found.")
        print("Use --list to see available commands.")
        sys.exit(1)

    if not cmd.enabled:
        print(f"Error: Command '{args.command}' is disabled.")
        sys.exit(1)

    asyncio.run(_execute(registry, args.command))


async def _execute(registry: CommandRegistry, command_name: str):
    async with async_session() as db:
        try:
            result = await registry.run_command(command_name, db)
            await db.commit()
        except Exception as e:
            await db.rollback()
            print(f"Error executing '{command_name}': {e}")
            sys.exit(1)

    print(f"Command: {result['command']}")
    print(f"Feature: {result['feature']}")
    print(f"Elapsed: {result['elapsed_seconds']}s")
    print(f"Result:  {result['result']}")


if __name__ == "__main__":
    main()
