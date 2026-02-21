"""Command discovery and execution system for feature-based maintenance tasks."""

from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Awaitable

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

CORE_FEATURES_DIR = Path(__file__).resolve().parent          # api/src/core/
PROJECT_FEATURES_DIR = Path(__file__).resolve().parent.parent / "features"  # api/src/features/


@dataclass
class CommandDefinition:
    """Declaration of a maintenance/cron command provided by a feature."""

    name: str
    label: str
    description: str = ""
    feature: str = ""
    handler: Callable[[AsyncSession], Awaitable[dict[str, Any]]] | None = None
    schedule: str = ""
    config_keys: list[str] = field(default_factory=list)
    enabled: bool = True


_command_registry_instance: "CommandRegistry | None" = None


def get_command_registry() -> "CommandRegistry | None":
    """Return the global CommandRegistry singleton (available after startup)."""
    return _command_registry_instance


class CommandRegistry:
    """Discovers and manages maintenance commands from feature directories."""

    def __init__(self):
        global _command_registry_instance
        self._commands: dict[str, CommandDefinition] = {}
        _command_registry_instance = self

    @property
    def commands(self) -> dict[str, CommandDefinition]:
        return self._commands

    def discover(self):
        """Scan feature directories for commands.py files and import them."""
        for base_dir in [CORE_FEATURES_DIR, PROJECT_FEATURES_DIR]:
            if not base_dir.exists():
                continue
            for commands_path in base_dir.rglob("commands.py"):
                rel = commands_path.relative_to(Path(__file__).resolve().parent.parent)
                module_name = "src." + str(rel.with_suffix("")).replace("\\", ".").replace("/", ".")

                feature_dir = commands_path.parent
                feature_rel = feature_dir.relative_to(base_dir)
                feature_name = str(feature_rel).replace("\\", ".").replace("/", ".")

                try:
                    module = importlib.import_module(module_name)
                    command_list: list[CommandDefinition] = module.commands
                    for cmd in command_list:
                        cmd.feature = cmd.feature or feature_name
                        if cmd.name in self._commands:
                            logger.warning(
                                f"Duplicate command name '{cmd.name}' from {commands_path}, "
                                f"overwriting previous from feature '{self._commands[cmd.name].feature}'"
                            )
                        self._commands[cmd.name] = cmd
                        logger.info(f"Discovered command: {cmd.name} ({cmd.label})")
                except Exception as e:
                    logger.error(f"Failed to load commands from {commands_path}: {e}")

    def get_command(self, name: str) -> CommandDefinition | None:
        return self._commands.get(name)

    def get_all_commands(self) -> list[CommandDefinition]:
        return list(self._commands.values())

    async def run_command(self, name: str, db: AsyncSession) -> dict[str, Any]:
        """Execute a command by name. Returns the command result dict."""
        cmd = self._commands.get(name)
        if not cmd:
            raise KeyError(f"Command '{name}' not found")
        if not cmd.enabled:
            raise RuntimeError(f"Command '{name}' is disabled")
        if not cmd.handler:
            raise RuntimeError(f"Command '{name}' has no handler")

        start = datetime.now(timezone.utc)
        result = await cmd.handler(db)
        elapsed = (datetime.now(timezone.utc) - start).total_seconds()

        return {
            "command": name,
            "feature": cmd.feature,
            "result": result,
            "elapsed_seconds": round(elapsed, 3),
            "executed_at": start.isoformat(),
        }
