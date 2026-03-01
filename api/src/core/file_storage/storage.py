"""Storage backend abstraction and local filesystem implementation."""

import os
from typing import Protocol, runtime_checkable

import aiofiles

from ..config import settings


@runtime_checkable
class StorageBackend(Protocol):
    """Abstract storage backend interface. Implement for S3, GCS, etc."""

    async def save(self, file_data: bytes, path: str) -> str:
        """Save file data to the given relative path. Returns the stored path."""
        ...

    async def read(self, path: str) -> bytes:
        """Read file data from the given relative path."""
        ...

    async def delete(self, path: str) -> None:
        """Delete a file at the given relative path."""
        ...

    async def exists(self, path: str) -> bool:
        """Check if a file exists at the given relative path."""
        ...


class LocalStorage:
    """Local filesystem storage backend."""

    def __init__(self, base_dir: str):
        self.base_dir = base_dir

    def _full_path(self, path: str) -> str:
        return os.path.join(self.base_dir, path)

    async def save(self, file_data: bytes, path: str) -> str:
        full = self._full_path(path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        async with aiofiles.open(full, "wb") as f:
            await f.write(file_data)
        return path

    async def read(self, path: str) -> bytes:
        full = self._full_path(path)
        async with aiofiles.open(full, "rb") as f:
            return await f.read()

    async def delete(self, path: str) -> None:
        full = self._full_path(path)
        if os.path.exists(full):
            os.remove(full)

    async def exists(self, path: str) -> bool:
        return os.path.exists(self._full_path(path))


_backend: StorageBackend | None = None


def get_storage_backend() -> StorageBackend:
    """Factory: return the configured storage backend (singleton)."""
    global _backend
    if _backend is not None:
        return _backend

    if settings.STORAGE_BACKEND == "s3":
        raise NotImplementedError(
            "S3 storage backend not yet implemented. Set STORAGE_BACKEND=local."
        )

    _backend = LocalStorage(settings.UPLOAD_DIR)
    return _backend
