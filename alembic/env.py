"""Alembic env.py — Auto-discovers models from all features."""

import sys
import os
import importlib
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the /app directory to sys.path so we can import src.*
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.core.database import Base
from src.core.config import settings


def import_all_feature_models():
    """Auto-discover and import all models.py from features/ and custom_features/."""
    src_dir = Path(__file__).resolve().parent.parent / "src"
    features_dirs = [
        src_dir / "features",
        src_dir / "custom_features",
    ]
    for base_dir in features_dirs:
        if not base_dir.exists():
            continue
        for models_path in base_dir.rglob("models.py"):
            rel = models_path.relative_to(src_dir.parent)
            module_name = str(rel.with_suffix("")).replace(os.sep, ".").replace("/", ".")
            try:
                importlib.import_module(module_name)
            except Exception as e:
                print(f"Warning: Could not import {module_name}: {e}")


# Import all models so they are registered with Base.metadata
import_all_feature_models()

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url_sync)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
