"""Translation engine — auto-discovers JSON files from all features."""

import json
import logging
from pathlib import Path

from ..config import settings

logger = logging.getLogger(__name__)

# Cache: {locale: {namespace: {key: value}}}
_translations: dict[str, dict[str, dict[str, str]]] = {}

_BASE_DIR = Path(__file__).resolve().parent.parent  # api/src/core/
_FEATURES_DIR = _BASE_DIR.parent / "features"  # api/src/features/


def load_translations() -> None:
    """Discover and load all translation JSON files.

    Sources (in order):
    1. core/i18n/locales/<locale>/<namespace>.json  (global common)
    2. core/<feature>/i18n/<locale>.json             (per core feature)
    3. core/<feature>/<sub>/i18n/<locale>.json        (per core sub-feature)
    4. features/<feature>/i18n/<locale>.json          (per project feature)
    """
    global _translations
    _translations.clear()

    # 1. Global locales: core/i18n/locales/<locale>/<namespace>.json
    locales_dir = Path(__file__).resolve().parent / "locales"
    if locales_dir.exists():
        for json_file in locales_dir.rglob("*.json"):
            rel = json_file.relative_to(locales_dir)
            parts = rel.parts  # e.g. ("fr", "common.json")
            if len(parts) == 2:
                locale = parts[0]
                namespace = json_file.stem
                _load_json(json_file, locale, namespace)

    # 2 & 3. Core features: core/<feature>/i18n/<locale>.json
    #         and sub-features: core/<feature>/<sub>/i18n/<locale>.json
    for i18n_dir in _BASE_DIR.rglob("i18n"):
        if not i18n_dir.is_dir():
            continue
        # Skip our own locales dir
        if i18n_dir == locales_dir or str(locales_dir) in str(i18n_dir):
            continue
        for json_file in i18n_dir.glob("*.json"):
            locale = json_file.stem  # "fr" or "en"
            # Derive namespace from feature path
            feature_dir = i18n_dir.parent
            namespace = _derive_namespace(feature_dir, _BASE_DIR)
            if namespace:
                _load_json(json_file, locale, namespace)

    # 4. Project features: features/<feature>/i18n/<locale>.json
    if _FEATURES_DIR.exists():
        for i18n_dir in _FEATURES_DIR.rglob("i18n"):
            if not i18n_dir.is_dir():
                continue
            for json_file in i18n_dir.glob("*.json"):
                locale = json_file.stem
                feature_dir = i18n_dir.parent
                namespace = _derive_namespace(feature_dir, _FEATURES_DIR)
                if namespace:
                    _load_json(json_file, locale, namespace)

    count = sum(
        sum(len(ns) for ns in locales.values())
        for locales in _translations.values()
    )
    logger.info(
        "i18n: loaded %d keys across %d locales",
        count,
        len(_translations),
    )


def _derive_namespace(feature_dir: Path, base_dir: Path) -> str | None:
    """Derive namespace from feature directory relative to base."""
    try:
        rel = feature_dir.relative_to(base_dir)
        parts = [p for p in rel.parts if not p.startswith("__")]
        if not parts:
            return None
        return ".".join(parts)
    except ValueError:
        return None


def _load_json(path: Path, locale: str, namespace: str) -> None:
    """Load a single JSON translation file into the cache."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return
        _translations.setdefault(locale, {}).setdefault(namespace, {}).update(data)
    except Exception as e:
        logger.warning("i18n: failed to load %s: %s", path, e)


def t(key: str, locale: str | None = None, **kwargs) -> str:
    """Translate a key.

    key format: "namespace.key_name" or just "key_name" (uses "common" namespace).
    Falls back to default locale, then returns the raw key.
    """
    if locale is None:
        locale = settings.I18N_DEFAULT_LOCALE

    # Split namespace from key
    if "." in key:
        parts = key.rsplit(".", 1)
        namespace, subkey = parts[0], parts[1]
    else:
        namespace = "common"
        subkey = key

    # Try requested locale
    value = _translations.get(locale, {}).get(namespace, {}).get(subkey)

    # Fallback to default locale
    if value is None and locale != settings.I18N_DEFAULT_LOCALE:
        value = (
            _translations.get(settings.I18N_DEFAULT_LOCALE, {})
            .get(namespace, {})
            .get(subkey)
        )

    # Fallback to raw key
    if value is None:
        return key

    # Interpolation
    if kwargs:
        try:
            return value.format(**kwargs)
        except (KeyError, IndexError):
            return value

    return value


def get_translations(locale: str, namespace: str) -> dict[str, str]:
    """Get all translations for a given locale and namespace."""
    return dict(_translations.get(locale, {}).get(namespace, {}))


def get_all_namespaces(locale: str) -> list[str]:
    """List all namespaces available for a locale."""
    return list(_translations.get(locale, {}).keys())


def reload_translations() -> None:
    """Force reload all translations (useful after hot-adding features)."""
    load_translations()
