"""Database backup / restore endpoints.

Endpoints:
  GET  /              - List backups and demos
  POST /              - Create a new backup (pg_dump)
  POST /restore       - Start an async restore job
  GET  /jobs/{id}     - Poll restore job status
  POST /copy-to-demo  - Copy a backup to the demo folder
  POST /copy-to-initial - Set a demo backup as the initial backup
"""

import os
import shutil

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ...core.permissions import require_permission
from .services import (
    INITIAL_BACKUP_FILENAME,
    backup_dir,
    demo_dir,
    get_restore_jobs,
    list_backup_files,
    run_pg_dump,
    start_restore_job,
)

router = APIRouter()


# ---------------------------------------------------------------------------
#  Schemas (local to this route file)
# ---------------------------------------------------------------------------


class RestoreRequest(BaseModel):
    filename: str
    source: str = "backups"  # "backups" or "demos"
    create_backup_first: bool = True


class CopyRequest(BaseModel):
    filename: str


# ---------------------------------------------------------------------------
#  Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    dependencies=[Depends(require_permission("backups.read"))],
)
async def list_backups():
    """List backup and demo files."""
    return {
        "backups": list_backup_files(backup_dir()),
        "demos": list_backup_files(demo_dir()),
    }


@router.post(
    "",
    dependencies=[Depends(require_permission("backups.create"))],
)
async def create_backup():
    """Create a new database backup."""
    filename = await run_pg_dump()
    return {"message": "Backup created successfully", "filename": filename}


@router.post(
    "/restore",
    dependencies=[Depends(require_permission("backups.restore"))],
)
async def restore_backup(request: RestoreRequest):
    """Start an async restore job.

    1. Validates the filename (path traversal protection)
    2. Optionally creates a safety backup
    3. Starts the restore in the background
    4. Returns a job_id for status polling
    """
    if ".." in request.filename or "/" in request.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    base = demo_dir() if request.source == "demos" else backup_dir()
    filepath = os.path.join(base, request.filename)
    if not os.path.isfile(filepath):
        raise HTTPException(status_code=404, detail="Backup file not found")

    backup_created = None
    if request.create_backup_first:
        backup_created = await run_pg_dump()

    job_id, _ = await start_restore_job(request.filename, request.source)

    jobs = get_restore_jobs()
    if job_id in jobs:
        jobs[job_id]["backup_created"] = backup_created

    return {"job_id": job_id, "backup_created": backup_created}


@router.get(
    "/jobs/{job_id}",
    dependencies=[Depends(require_permission("backups.read"))],
)
async def get_job_status(job_id: str):
    """Poll a restore job status."""
    jobs = get_restore_jobs()
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post(
    "/copy-to-demo",
    dependencies=[Depends(require_permission("backups.create"))],
)
async def copy_to_demo(request: CopyRequest):
    """Copy a backup file to the demo folder."""
    if ".." in request.filename or "/" in request.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    src = os.path.join(backup_dir(), request.filename)
    if not os.path.isfile(src):
        raise HTTPException(status_code=404, detail="Backup file not found")

    os.makedirs(demo_dir(), exist_ok=True)
    dst = os.path.join(demo_dir(), request.filename)
    shutil.copy2(src, dst)

    return {"message": f"{request.filename} copied to demo folder"}


@router.post(
    "/copy-to-initial",
    dependencies=[Depends(require_permission("backups.create"))],
)
async def copy_to_initial(request: CopyRequest):
    """Set a demo file as the initial backup.

    The initial backup (``backup_template_db_initial.dump``) sits at the root
    of the backup directory and contains the full schema + admin users only.
    """
    if ".." in request.filename or "/" in request.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    src = os.path.join(demo_dir(), request.filename)
    if not os.path.isfile(src):
        raise HTTPException(status_code=404, detail="Demo file not found")

    dst = os.path.join(backup_dir(), INITIAL_BACKUP_FILENAME)
    shutil.copy2(src, dst)

    return {"message": f"{request.filename} defini comme backup initial ({INITIAL_BACKUP_FILENAME})"}
