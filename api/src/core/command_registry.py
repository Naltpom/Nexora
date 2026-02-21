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

    def load_states_from_db_sync(self):
        """Load command enabled/disabled states from DB at startup (sync)."""
        from sqlalchemy import create_engine
        from sqlalchemy.orm import Session
        from .config import settings

        sync_engine = create_engine(settings.database_url_sync)
        try:
            with Session(sync_engine) as session:
                from ._identity.models import CommandState
                from sqlalchemy import inspect as sa_inspect

                inspector = sa_inspect(sync_engine)
                if "command_states" not in inspector.get_table_names():
                    return
                from sqlalchemy import select
                rows = session.execute(select(CommandState)).scalars().all()
                for state in rows:
                    if state.name in self._commands:
                        self._commands[state.name].enabled = state.enabled
                        logger.info(
                            f"Command '{state.name}' state loaded from DB: "
                            f"enabled={state.enabled}"
                        )
        except Exception as e:
            logger.warning(f"Could not load command states from DB: {e}")
        finally:
            sync_engine.dispose()

    def set_command_enabled(self, name: str, enabled: bool):
        """Update the in-memory enabled state of a command."""
        cmd = self._commands.get(name)
        if cmd:
            cmd.enabled = enabled

    def get_command(self, name: str) -> CommandDefinition | None:
        return self._commands.get(name)

    def get_all_commands(self) -> list[CommandDefinition]:
        return list(self._commands.values())

    async def run_command(
        self,
        name: str,
        db: AsyncSession,
        executed_by: int | None = None,
        source: str = "api",
    ) -> dict[str, Any]:
        """Execute a command by name, log execution to DB. Returns the command result dict."""
        cmd = self._commands.get(name)
        if not cmd:
            raise KeyError(f"Command '{name}' not found")
        if not cmd.enabled:
            raise RuntimeError(f"Command '{name}' is disabled")
        if not cmd.handler:
            raise RuntimeError(f"Command '{name}' has no handler")

        start = datetime.now(timezone.utc)
        result_dict = None
        error_msg = None
        status = "success"

        try:
            result_dict = await cmd.handler(db)
        except Exception as e:
            status = "error"
            error_msg = str(e)
            logger.error(f"Command '{name}' failed: {e}")

        elapsed = round((datetime.now(timezone.utc) - start).total_seconds(), 3)

        # Log execution to DB
        try:
            from ._identity.models import CommandExecution
            log_entry = CommandExecution(
                command_name=name,
                command_label=cmd.label,
                feature=cmd.feature,
                status=status,
                result=result_dict,
                error_message=error_msg,
                duration_seconds=elapsed,
                source=source,
                executed_by=executed_by,
                executed_at=start,
            )
            db.add(log_entry)
        except Exception as e:
            logger.warning(f"Could not log command execution: {e}")

        if status == "error":
            raise RuntimeError(error_msg or f"Command '{name}' failed")

        return {
            "command": name,
            "feature": cmd.feature,
            "result": result_dict,
            "elapsed_seconds": elapsed,
            "executed_at": start.isoformat(),
        }
