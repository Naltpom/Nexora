"""Mass fixture generator for file_storage: documents and policies."""

import hashlib
import io
import random
import struct
import uuid as uuid_mod
import zlib
from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..fixture_registry import FixtureContext, FixtureDefinition
from .models import FileStoragePolicy, StorageDocument
from .storage import get_storage_backend
from .thumbnails import can_generate_thumbnail, generate_thumbnail

fake = Faker("fr_FR")

# ---------------------------------------------------------------------------
# File type distribution helpers
# ---------------------------------------------------------------------------

IMAGE_EXTENSIONS = [(".png", "image/png"), (".jpg", "image/jpeg")]

PDF_EXTENSION = (".pdf", "application/pdf")

TEXT_EXTENSIONS = [(".txt", "text/plain"), (".csv", "text/csv")]

OTHER_EXTENSIONS = [
    (".json", "application/json"),
    (".xml", "application/xml"),
    (".zip", "application/zip"),
]

IMAGE_RESOURCE_TYPES = ["user_avatar", "general"]
PDF_RESOURCE_TYPES = ["invoice", "bill", "curriculum"]
TEXT_RESOURCE_TYPES = ["ticket_attachment", "document"]
OTHER_RESOURCE_TYPES = ["general"]

IMAGE_FILENAMES = [
    "photo_profil", "avatar", "capture_ecran", "logo", "banniere",
    "image_projet", "photo_equipe", "schema", "graphique", "illustration",
]

PDF_FILENAMES = [
    "facture_{n}", "devis_{n}", "contrat_{n}", "rapport_{n}", "CV_{name}",
    "bulletin_{n}", "attestation_{n}", "bon_commande_{n}",
]

TEXT_FILENAMES = [
    "notes", "export_donnees", "rapport_mensuel", "compte_rendu",
    "todo_list", "description_projet", "specifications",
]

# Category mapping
RESOURCE_TYPE_CATEGORIES = {
    "user_avatar": "avatar",
    "general": "document",
    "invoice": "finance",
    "bill": "finance",
    "curriculum": "hr",
    "ticket_attachment": "support",
    "document": "document",
}


# ---------------------------------------------------------------------------
# Minimal file generators (kept small for fixture speed)
# ---------------------------------------------------------------------------

def _generate_png_bytes(width: int, height: int, r: int, g: int, b: int) -> bytes:
    """Generate a minimal valid PNG with a solid color rectangle."""

    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        c = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)
        return struct.pack(">I", len(data)) + c + crc

    signature = b"\x89PNG\r\n\x1a\n"

    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = _chunk(b"IHDR", ihdr_data)

    raw_rows = b""
    row_bytes = bytes([r, g, b]) * width
    for _ in range(height):
        raw_rows += b"\x00" + row_bytes

    compressed = zlib.compress(raw_rows)
    idat = _chunk(b"IDAT", compressed)
    iend = _chunk(b"IEND", b"")

    return signature + ihdr + idat + iend


def _generate_jpeg_bytes(width: int, height: int, r: int, g: int, b: int) -> bytes:
    """Generate a small JPEG using Pillow."""
    from PIL import Image

    img = Image.new("RGB", (width, height), (r, g, b))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=60)
    return buf.getvalue()


def _generate_pdf_bytes(title: str) -> bytes:
    """Generate a minimal valid PDF binary."""
    content = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj

4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
({title}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000230 00000 n

trailer
<< /Size 5 /Root 1 0 R >>
startxref
326
%%EOF"""
    return content.encode("latin-1")


def _generate_text_bytes() -> bytes:
    """Generate a text file using Faker paragraphs."""
    paragraphs = fake.paragraphs(nb=random.randint(2, 8))
    return "\n\n".join(paragraphs).encode("utf-8")


# ---------------------------------------------------------------------------
# Document fixture handler
# ---------------------------------------------------------------------------

async def _generate_documents(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate fake files on disk + StorageDocument DB records."""
    scale = ctx.scale
    user_ids = ctx.user_ids
    admin_id = ctx.admin_id or (user_ids[0] if user_ids else None)

    if not user_ids:
        return {"error": "No user IDs available. _identity fixtures must run first."}

    storage = get_storage_backend()
    now = datetime.now(timezone.utc)
    total = min(max(scale // 100, 10), 100)

    # Distribution: 40% images, 30% pdf, 20% text, 10% other
    counts = {
        "image": int(total * 0.40),
        "pdf": int(total * 0.30),
        "text": int(total * 0.20),
    }
    counts["other"] = total - counts["image"] - counts["pdf"] - counts["text"]

    # Status distribution: 80% approved, 15% pending, 5% rejected
    statuses = (
        ["approved"] * 16
        + ["pending"] * 3
        + ["rejected"] * 1
    )

    document_ids: list[int] = []
    stats = {"images": 0, "pdfs": 0, "texts": 0, "others": 0, "thumbnails": 0}

    # Build a flat work list
    work: list[tuple[str, str, str, str, bytes]] = []  # (kind, ext, mime, resource_type, data)

    for _ in range(counts["image"]):
        ext, mime = random.choice(IMAGE_EXTENSIONS)
        w = random.randint(100, 300)
        h = random.randint(100, 300)
        r, g, b = random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)
        if ext == ".png":
            data = _generate_png_bytes(w, h, r, g, b)
        else:
            data = _generate_jpeg_bytes(w, h, r, g, b)
        rt = random.choice(IMAGE_RESOURCE_TYPES)
        work.append(("image", ext, mime, rt, data))

    for _ in range(counts["pdf"]):
        ext, mime = PDF_EXTENSION
        title = fake.sentence(nb_words=4)
        data = _generate_pdf_bytes(title)
        rt = random.choice(PDF_RESOURCE_TYPES)
        work.append(("pdf", ext, mime, rt, data))

    for _ in range(counts["text"]):
        ext, mime = random.choice(TEXT_EXTENSIONS)
        data = _generate_text_bytes()
        rt = random.choice(TEXT_RESOURCE_TYPES)
        work.append(("text", ext, mime, rt, data))

    for _ in range(counts["other"]):
        ext, mime = random.choice(OTHER_EXTENSIONS)
        data = fake.text(max_nb_chars=500).encode("utf-8")
        rt = random.choice(OTHER_RESOURCE_TYPES)
        work.append(("other", ext, mime, rt, data))

    random.shuffle(work)

    for kind, ext, mime, resource_type, file_data in work:
        user_id = random.choice(user_ids)
        days_ago = random.randint(0, 90)
        hours_ago = random.randint(0, 23)
        created_at = now - timedelta(days=days_ago, hours=hours_ago)

        file_uuid = uuid_mod.uuid4().hex
        stored_filename = f"{file_uuid}{ext}"
        year = created_at.strftime("%Y")
        month = created_at.strftime("%m")
        storage_path = f"{resource_type}/{year}/{month}/{stored_filename}"

        # Generate original filename
        if kind == "image":
            base = random.choice(IMAGE_FILENAMES)
            original = f"{base}{ext}"
        elif kind == "pdf":
            template = random.choice(PDF_FILENAMES)
            original = template.format(n=random.randint(1000, 9999), name=fake.last_name()) + ext
        elif kind == "text":
            base = random.choice(TEXT_FILENAMES)
            original = f"{base}{ext}"
        else:
            original = f"fichier_{random.randint(1, 999)}{ext}"

        # Save file to storage
        await storage.save(file_data, storage_path)

        # Checksum
        checksum = hashlib.sha256(file_data).hexdigest()

        # Thumbnail for images
        has_thumbnail = False
        if can_generate_thumbnail(mime):
            has_thumbnail = await generate_thumbnail(file_data, storage_path, mime)
            if has_thumbnail:
                stats["thumbnails"] += 1

        # Status
        status = random.choice(statuses)
        moderated_by_id = None
        moderated_at = None
        if status in ("pending", "rejected"):
            moderated_by_id = admin_id
            moderated_at = created_at + timedelta(hours=random.randint(1, 48))

        category = RESOURCE_TYPE_CATEGORIES.get(resource_type, "document")

        doc = StorageDocument(
            uuid=str(uuid_mod.uuid4()),
            original_filename=original,
            stored_filename=stored_filename,
            mime_type=mime,
            extension=ext.lstrip("."),
            size_bytes=len(file_data),
            storage_backend="local",
            storage_path=storage_path,
            uploaded_by=user_id,
            resource_type=resource_type,
            resource_id=random.randint(1, 200) if resource_type != "user_avatar" else user_id,
            category=category,
            has_thumbnail=has_thumbnail,
            checksum_sha256=checksum,
            is_public=resource_type in ("general", "user_avatar"),
            scan_status="clean",
            scan_result=None,
            status=status,
            moderated_by_id=moderated_by_id,
            moderated_at=moderated_at,
            created_at=created_at,
        )
        db.add(doc)

        if kind == "image":
            stats["images"] += 1
        elif kind == "pdf":
            stats["pdfs"] += 1
        elif kind == "text":
            stats["texts"] += 1
        else:
            stats["others"] += 1

    await db.flush()

    # Collect generated IDs
    result = await db.execute(
        select(StorageDocument.id).order_by(StorageDocument.id.desc()).limit(total)
    )
    document_ids = [row[0] for row in result.all()]

    ctx.set("file_storage.document_ids", document_ids)

    return {
        "total_documents": total,
        "images": stats["images"],
        "pdfs": stats["pdfs"],
        "texts": stats["texts"],
        "others": stats["others"],
        "thumbnails_generated": stats["thumbnails"],
        "date_range_days": 90,
    }


# ---------------------------------------------------------------------------
# Policy fixture handler
# ---------------------------------------------------------------------------

POLICY_DEFINITIONS = [
    ("user_avatar", False),
    ("invoice", True),
    ("bill", True),
    ("curriculum", True),
    ("ticket_attachment", False),
    ("document", False),
    ("general", False),
]


async def _generate_policies(db: AsyncSession, ctx: FixtureContext) -> dict[str, Any]:
    """Generate FileStoragePolicy records for each resource type."""
    admin_id = ctx.admin_id or (ctx.user_ids[0] if ctx.user_ids else None)
    now = datetime.now(timezone.utc)

    policies_created = 0
    with_moderation = 0
    for resource_type, requires_mod in POLICY_DEFINITIONS:
        policy = FileStoragePolicy(
            resource_type=resource_type,
            requires_moderation=requires_mod,
            updated_at=now - timedelta(days=fake.random_int(min=1, max=30)),
            updated_by_id=admin_id,
        )
        db.add(policy)
        policies_created += 1
        if requires_mod:
            with_moderation += 1

    await db.flush()

    return {
        "policies_created": policies_created,
        "with_moderation": with_moderation,
        "without_moderation": policies_created - with_moderation,
    }


# ---------------------------------------------------------------------------
# Registry export
# ---------------------------------------------------------------------------

fixtures = [
    FixtureDefinition(
        name="file_storage_documents",
        label="Storage Documents",
        description="Generate fake files on disk + DB records (images, PDFs, text, misc)",
        depends=["_identity"],
        handler=_generate_documents,
        check_table="storage_documents",
        check_min_rows=20,
    ),
    FixtureDefinition(
        name="file_storage_policies",
        label="File Storage Policies",
        description="Generate moderation policies per resource type",
        depends=["_identity"],
        handler=_generate_policies,
        check_table="file_storage_policies",
        check_min_rows=3,
    ),
]
