"""Thumbnail generation for image files using Pillow."""

import io
import logging

from ..config import settings
from .storage import get_storage_backend

logger = logging.getLogger(__name__)

THUMBNAIL_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def can_generate_thumbnail(mime_type: str) -> bool:
    """Check if a thumbnail can be generated for this MIME type."""
    return mime_type in THUMBNAIL_MIME_TYPES


async def generate_thumbnail(
    file_data: bytes,
    storage_path: str,
    mime_type: str,
) -> bool:
    """Generate a thumbnail for an image file.

    Stores the thumbnail in 'thumbs/{storage_path}' mirroring the original path.

    Returns:
        True if thumbnail was generated, False otherwise.
    """
    if not can_generate_thumbnail(mime_type):
        return False

    try:
        from PIL import Image

        img = Image.open(io.BytesIO(file_data))

        # Convert RGBA to RGB for JPEG output
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")

        max_size = settings.UPLOAD_THUMBNAIL_SIZE
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85, optimize=True)
        thumb_data = buffer.getvalue()

        thumb_path = f"thumbs/{storage_path}"
        storage = get_storage_backend()
        await storage.save(thumb_data, thumb_path)

        return True

    except Exception as e:
        logger.error("Thumbnail generation failed for %s: %s", storage_path, str(e))
        return False


async def get_thumbnail_path(storage_path: str) -> str | None:
    """Get the storage path for a thumbnail, if it exists."""
    thumb_path = f"thumbs/{storage_path}"
    storage = get_storage_backend()
    if await storage.exists(thumb_path):
        return thumb_path
    return None
