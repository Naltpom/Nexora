"""FastAPI application entry point with feature-based module loading."""

import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from .core.config import settings
from .core.database import engine, async_session, Base
from .core.feature_registry import FeatureRegistry

logger = logging.getLogger(__name__)

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.BACKUP_DIR, exist_ok=True)

# Global feature registry
registry = FeatureRegistry()


def load_feature_states_sync() -> dict[str, bool]:
    """Load feature states from DB at startup (sync, before async loop)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    sync_engine = create_engine(settings.database_url_sync)
    states = {}
    try:
        with Session(sync_engine) as session:
            from .features._core.models import FeatureState

            # Check if table exists first
            from sqlalchemy import inspect
            inspector = inspect(sync_engine)
            if "feature_states" in inspector.get_table_names():
                rows = session.execute(select(FeatureState)).scalars().all()
                for row in rows:
                    states[row.name] = row.is_active
    except Exception as e:
        logger.warning(f"Could not load feature states from DB: {e}. Using defaults.")
    finally:
        sync_engine.dispose()
    return states


def import_all_models():
    """Import all models from all features so Alembic can detect them."""
    import importlib
    from .core.feature_registry import FEATURES_DIR, CUSTOM_FEATURES_DIR
    from pathlib import Path

    for base_dir in [FEATURES_DIR, CUSTOM_FEATURES_DIR]:
        if not base_dir.exists():
            continue
        for models_path in base_dir.rglob("models.py"):
            rel = models_path.relative_to(Path(__file__).resolve().parent)
            module_name = "src." + str(rel.with_suffix("")).replace("\\", ".").replace("/", ".")
            try:
                importlib.import_module(module_name)
            except Exception as e:
                logger.warning(f"Could not import models from {module_name}: {e}")


def create_app() -> FastAPI:
    application = FastAPI(
        title="Kertios Template",
        description="Feature-based modular application template",
        version="2026.02.9",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # ── CORS ─────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5472"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Import all models (for Alembic) ──────────────────────────────
    import_all_models()

    # ── Feature discovery ────────────────────────────────────────────
    registry.discover()

    # ── Load feature states from DB ──────────────────────────────────
    db_states = load_feature_states_sync()
    registry.load_states(db_states)
    registry.validate()

    # ── Register feature middleware ──────────────────────────────────
    registry.register_middleware(application)

    # ── Register feature routes ──────────────────────────────────────
    registry.register_routes(application, dev_mode=settings.is_dev)

    # ── Static files ─────────────────────────────────────────────────
    application.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

    # ── Store registry in app state ──────────────────────────────────
    application.state.feature_registry = registry

    # ── Startup event: sync permissions ──────────────────────────────
    @application.on_event("startup")
    async def on_startup():
        from .features._core.services import sync_permissions_from_registry

        async with async_session() as db:
            try:
                await sync_permissions_from_registry(db, registry)
                await db.commit()
                logger.info("Permissions synced from feature manifests.")
            except Exception as e:
                logger.warning(f"Could not sync permissions at startup: {e}")

    return application


app = create_app()
