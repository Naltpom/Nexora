"""RTE image upload endpoint for comments rich text editor."""

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..config import settings
from ..permissions import require_permission
from ..security import get_current_user

router = APIRouter()

UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "rte")
ALLOWED_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}


@router.post(
    "/image",
    dependencies=[Depends(require_permission("comments.create"))],
)
async def upload_rte_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Upload an image for the rich text editor."""
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Type de fichier non autorise")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "img.png")[1] or ".png"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/api/uploads/rte/{filename}"}
