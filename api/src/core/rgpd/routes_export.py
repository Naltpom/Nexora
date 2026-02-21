"""Data export endpoints — RGPD data portability (Article 20)."""

import csv
import io
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..security import get_current_user
from .schemas import DataPreviewResponse, DataPreviewSection
from .services import collect_user_data

router = APIRouter()


@router.get("/preview", response_model=DataPreviewResponse)
async def preview_my_data(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Preview what personal data is stored about the current user."""
    data = await collect_user_data(db, current_user.id)

    sections = []
    for section_name, section_data in data.items():
        if isinstance(section_data, list):
            fields = list(section_data[0].keys()) if section_data else []
            sections.append(DataPreviewSection(section=section_name, count=len(section_data), fields=fields))
        elif isinstance(section_data, dict):
            sections.append(DataPreviewSection(section=section_name, count=1, fields=list(section_data.keys())))

    return DataPreviewResponse(
        user_email=current_user.email,
        sections=sections,
        generated_at=datetime.now(timezone.utc),
    )


@router.post("/json")
async def export_my_data_json(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all personal data as JSON."""
    data = await collect_user_data(db, current_user.id)

    export = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user_email": current_user.email,
        "data": data,
    }

    content = json.dumps(export, indent=2, default=str, ensure_ascii=False)

    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=mes-donnees-{current_user.id}.json"},
    )


@router.post("/csv")
async def export_my_data_csv(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all personal data as CSV."""
    data = await collect_user_data(db, current_user.id)

    output = io.StringIO()
    writer = csv.writer(output)

    for section_name, section_data in data.items():
        writer.writerow([f"=== {section_name} ==="])

        if isinstance(section_data, dict):
            section_data = [section_data]

        if isinstance(section_data, list) and section_data:
            headers = list(section_data[0].keys())
            writer.writerow(headers)
            for row in section_data:
                writer.writerow([str(row.get(h, "")) for h in headers])

        writer.writerow([])

    content = output.getvalue()

    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=mes-donnees-{current_user.id}.csv"},
    )
