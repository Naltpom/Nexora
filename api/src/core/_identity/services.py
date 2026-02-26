"""Core business-logic helpers.

All heavy orchestration that used to live in use-case classes is flattened
into plain async functions that receive a SQLAlchemy ``AsyncSession`` directly.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..security import (
    create_access_token,
    create_mfa_token,
    create_refresh_token,
    verify_password,
)
from .models import Permission, SecurityToken, User

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
#  Security Token helpers
# ---------------------------------------------------------------------------


async def create_security_token(
    db: AsyncSession,
    user_id: int,
    token_type: str,
    raw_value: str,
    expires_minutes: int = 5,
) -> SecurityToken:
    """Create a SecurityToken. Invalidates any existing unused token of the same type for this user."""
    now = datetime.now(timezone.utc)

    # Invalidate previous unused tokens of same type for this user
    result = await db.execute(
        select(SecurityToken).where(
            SecurityToken.user_id == user_id,
            SecurityToken.token_type == token_type,
            SecurityToken.used_at.is_(None),
        )
    )
    for old_token in result.scalars().all():
        old_token.used_at = now  # mark as consumed

    token = SecurityToken(
        user_id=user_id,
        token_type=token_type,
        token_hash=SecurityToken.hash_value(raw_value),
        expires_at=now + timedelta(minutes=expires_minutes),
    )
    db.add(token)
    await db.flush()
    return token


async def verify_security_token(
    db: AsyncSession,
    raw_value: str,
    token_type: str,
    user_id: int | None = None,
) -> SecurityToken | None:
    """Find and verify a security token. Returns the token if valid, None otherwise.

    For verification codes (6-digit): pass user_id to scope the lookup.
    For reset tokens (UUID): hash-based direct lookup (no user_id needed).
    """
    now = datetime.now(timezone.utc)
    token_hash = SecurityToken.hash_value(raw_value)

    query = select(SecurityToken).where(
        SecurityToken.token_hash == token_hash,
        SecurityToken.token_type == token_type,
        SecurityToken.used_at.is_(None),
    )
    if user_id is not None:
        query = query.where(SecurityToken.user_id == user_id)

    result = await db.execute(query)
    token = result.scalar_one_or_none()

    if not token:
        return None
    if token.expires_at < now:
        return None
    return token


async def consume_security_token(db: AsyncSession, token: SecurityToken):
    """Mark a security token as used."""
    token.used_at = datetime.now(timezone.utc)
    await db.flush()


async def get_latest_security_token(
    db: AsyncSession,
    user_id: int,
    token_type: str,
) -> SecurityToken | None:
    """Get the most recent token for cooldown checks."""
    result = await db.execute(
        select(SecurityToken)
        .where(
            SecurityToken.user_id == user_id,
            SecurityToken.token_type == token_type,
        )
        .order_by(SecurityToken.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
#  Authentication
# ---------------------------------------------------------------------------


async def authenticate_intranet(email: str, password: str) -> dict | None:
    """Try authenticating via the intranet SSO endpoint.

    Returns a dict with user fields on success, ``None`` otherwise.
    """
    if not settings.INTRANET_AUTH_URL:
        return None

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "fr-FR,fr;q=0.9",
        }
        async with httpx.AsyncClient(
            verify=False,
            timeout=10.0,
            headers=headers,
            follow_redirects=True,
        ) as client:
            response = await client.post(
                settings.INTRANET_AUTH_URL,
                data={"mail": email, "mdp": password},
            )
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("retour") == "Ok":
                        parts = email.split("@")[0].split(".")
                        first_name = parts[0].capitalize() if len(parts) > 0 else ""
                        last_name = parts[1].capitalize() if len(parts) > 1 else ""
                        return {
                            "email": email,
                            "first_name": first_name,
                            "last_name": last_name,
                        }
                except (ValueError, KeyError):
                    pass
    except Exception:
        logger.exception("Intranet authentication failed for %s", email)

    return None


async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> dict:
    """Authenticate a user (intranet SSO or local) and return a token dict.

    Raises ``HTTPException`` on failure.
    """
    from fastapi import HTTPException, status

    email = email.lower()
    user = None

    # --- Intranet SSO --------------------------------------------------------
    if settings.INTRANET_EMAIL_DOMAIN and email.endswith(f"@{settings.INTRANET_EMAIL_DOMAIN}") and settings.INTRANET_AUTH_URL:
        intranet_data = await authenticate_intranet(email, password)
        if intranet_data:
            result = await db.execute(
                select(User).where(User.email == email, User.deleted_at.is_(None))
            )
            user = result.scalar_one_or_none()

            if not user:
                user = User(
                    email=email,
                    first_name=intranet_data["first_name"],
                    last_name=intranet_data["last_name"],
                    auth_source="intranet",
                    is_active=True,
                    must_change_password=False,
                )
                db.add(user)
                await db.flush()

            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Email ou mot de passe incorrect",
                )

    # --- Local auth fallback -------------------------------------------------
    if not user:
        result = await db.execute(
            select(User).where(User.email == email, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()

        # Check for soft-deleted account eligible for reactivation (30 days)
        if not user:
            cutoff = datetime.now(timezone.utc) - timedelta(days=30)
            result = await db.execute(
                select(User).where(
                    User.email == email,
                    User.deleted_at.isnot(None),
                    User.deleted_at > cutoff,
                )
            )
            soft_deleted = result.scalar_one_or_none()
            if soft_deleted and soft_deleted.password_hash and verify_password(password, soft_deleted.password_hash):
                soft_deleted.deleted_at = None
                soft_deleted.is_active = True
                await db.flush()
                user = soft_deleted

        if not user or not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )
        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )

    # --- Email verification check --------------------------------------------
    if not user.email_verified:
        import random

        code = str(random.randint(100000, 999999))
        await create_security_token(db, user.id, "email_verification", code, expires_minutes=5)

        if settings.EMAIL_ENABLED:
            try:
                from ..notification.email.services import get_email_sender

                sender = get_email_sender()
                sender.send_verification_code(
                    to_email=user.email,
                    to_name=user.first_name,
                    verification_code=code,
                )
            except Exception:
                pass

        return {
            "access_token": "",
            "refresh_token": "",
            "must_change_password": False,
            "preferences": None,
            "mfa_required": False,
            "mfa_token": None,
            "mfa_methods": None,
            "mfa_setup_required": False,
            "mfa_grace_period_expires": None,
            "email_verification_required": True,
            "email_verification_email": user.email,
            "debug_code": code if not settings.EMAIL_ENABLED else None,
        }

    # --- Update last login ---------------------------------------------------
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    # --- Check MFA (only if feature is active) -------------------------------
    mfa_result: dict = {"mfa_required": False, "available_methods": []}
    try:
        from ..feature_registry import get_registry
        registry = get_registry()
        if registry and registry.is_active("mfa"):
            from ..mfa.services import is_mfa_required_for_user
            mfa_result = await is_mfa_required_for_user(db, user)
    except (ImportError, Exception):
        pass

    if mfa_result.get("mfa_required"):
        return {
            "access_token": "",
            "refresh_token": "",
            "must_change_password": False,
            "preferences": None,
            "mfa_required": True,
            "mfa_token": create_mfa_token(user.id, user.email),
            "mfa_methods": mfa_result.get("available_methods", []),
            "mfa_setup_required": False,
        }

    # --- Build response ------------------------------------------------------
    token_data = {"sub": str(user.id), "email": user.email, "lang": user.language}
    preferences = user.preferences

    # --- Compute MFA grace period expiration if setup required ---------------
    mfa_setup_required = mfa_result.get("mfa_setup_required", False)
    mfa_grace_period_expires = None
    if mfa_setup_required:
        grace_days = mfa_result.get("grace_period_days", 7)
        # Grace period starts from whichever is more recent: policy update or user creation
        policy_updated = mfa_result.get("policy_updated_at")
        if policy_updated:
            from datetime import datetime as _dt
            policy_dt = _dt.fromisoformat(policy_updated)
            start = max(policy_dt, user.created_at) if user.created_at else policy_dt
        else:
            start = user.created_at
        if start:
            expires = start + timedelta(days=grace_days)
            mfa_grace_period_expires = expires.isoformat()

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "must_change_password": user.must_change_password,
        "preferences": preferences,
        "mfa_required": False,
        "mfa_token": None,
        "mfa_methods": None,
        "mfa_setup_required": mfa_setup_required,
        "mfa_grace_period_expires": mfa_grace_period_expires,
    }


# ---------------------------------------------------------------------------
#  Permission sync
# ---------------------------------------------------------------------------


async def sync_permissions_from_registry(db: AsyncSession, registry) -> None:
    """Ensure every permission declared in feature manifests exists in the DB.

    *registry* is a ``FeatureRegistry`` instance.
    """
    all_perms = registry.collect_all_permissions()
    for perm_info in all_perms:
        result = await db.execute(
            select(Permission).where(Permission.code == perm_info["code"])
        )
        existing = result.scalar_one_or_none()
        if not existing:
            db.add(
                Permission(
                    code=perm_info["code"],
                    feature=perm_info["feature"],
                    label=perm_info.get("label"),
                    description=perm_info.get("description"),
                )
            )
        else:
            # Keep feature, label, description in sync with manifest
            if existing.feature != perm_info["feature"]:
                existing.feature = perm_info["feature"]
            if not existing.label and perm_info.get("label"):
                existing.label = perm_info["label"]
            if not existing.description and perm_info.get("description"):
                existing.description = perm_info["description"]

    # Sync assignment_rules from fixtures (only for permissions with non-default rules)
    # Mirror of alembic/fixtures/permission_assignment_rules.py
    PERMISSION_ASSIGNMENT_RULES: dict[str, dict[str, bool]] = {
        "mfa.bypass": {"user": True, "role": False, "global": False},
    }
    for code, rules in PERMISSION_ASSIGNMENT_RULES.items():
        result = await db.execute(select(Permission).where(Permission.code == code))
        perm = result.scalar_one_or_none()
        if perm and perm.assignment_rules != rules:
            perm.assignment_rules = rules

    await db.flush()


# ---------------------------------------------------------------------------
#  Invitation helpers
# ---------------------------------------------------------------------------


async def find_pending_invitation(db: AsyncSession, token: str):
    """Walk all pending invitations and return the one matching *token*.

    Raises ``HTTPException(400)`` when not found.
    """
    from fastapi import HTTPException

    from .models import Invitation

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation).where(
            Invitation.consumed_at.is_(None),
            Invitation.expires_at > now,
        )
    )
    invitations = result.scalars().all()

    for inv in invitations:
        if verify_password(token, inv.token_hash):
            return inv

    raise HTTPException(status_code=400, detail="Invitation invalide ou expiree")


# ---------------------------------------------------------------------------
#  Backup helpers (kept here to avoid circular imports)
# ---------------------------------------------------------------------------

import asyncio  # noqa: E402
import os  # noqa: E402

RETENTION_DAYS = 7
INITIAL_BACKUP_FILENAME = "backup_template_db_initial.dump"

# In-memory job storage for restore operations
_restore_jobs: dict[str, dict] = {}


def backup_dir() -> str:
    return settings.BACKUP_DIR


def demo_dir() -> str:
    return os.path.join(settings.BACKUP_DIR, "demo")


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def list_backup_files(directory: str) -> list[dict]:
    if not os.path.isdir(directory):
        return []
    files = []
    for name in os.listdir(directory):
        if not (name.endswith(".sql") or name.endswith(".dump")):
            continue
        filepath = os.path.join(directory, name)
        if not os.path.isfile(filepath):
            continue
        stat = os.stat(filepath)
        files.append({
            "filename": name,
            "size": stat.st_size,
            "size_display": format_size(stat.st_size),
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "type": "dump" if name.endswith(".dump") else "sql",
        })
    files.sort(key=lambda f: f["created_at"], reverse=True)
    return files


def _pg_env() -> dict:
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD
    return env


async def run_pg_dump(target_dir: str | None = None) -> str:
    """Run ``pg_dump`` and return the generated filename."""
    from fastapi import HTTPException

    directory = target_dir or backup_dir()
    os.makedirs(directory, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{timestamp}.sql"
    filepath = os.path.join(directory, filename)

    process = await asyncio.create_subprocess_exec(
        "pg_dump",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        "--clean", "--if-exists",
        "-f", filepath,
        env=_pg_env(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await process.communicate()

    if process.returncode != 0:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"pg_dump failed: {stderr.decode()}")

    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail="Backup file is empty")

    # Cleanup old backups (> RETENTION_DAYS) in main folder only
    if directory == backup_dir():
        now_ts = datetime.now().timestamp()
        for name in os.listdir(directory):
            if not name.startswith("backup_") or not name.endswith(".sql"):
                continue
            fp = os.path.join(directory, name)
            if fp != filepath and os.path.isfile(fp) and (now_ts - os.stat(fp).st_mtime) > RETENTION_DAYS * 86400:
                os.remove(fp)

    return filename


def _filter_sql(raw: bytes) -> bytes:
    return b"\n".join(
        line for line in raw.split(b"\n")
        if b"transaction_timeout" not in line
    )


async def _run_psql(sql_bytes: bytes) -> None:
    psql_proc = await asyncio.create_subprocess_exec(
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=_pg_env(),
    )
    _, stderr = await psql_proc.communicate(input=sql_bytes)
    if psql_proc.returncode != 0:
        stderr_text = stderr.decode()
        error_lines = [line for line in stderr_text.split("\n") if "ERROR" in line]
        if error_lines:
            raise RuntimeError(f"psql errors: {chr(10).join(error_lines[:5])}")


async def _restore_dump(filepath: str) -> None:
    pg_restore_proc = await asyncio.create_subprocess_exec(
        "pg_restore", "--clean", "--if-exists", "-f", "-", filepath,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    sql_output, _ = await pg_restore_proc.communicate()
    if not sql_output:
        raise RuntimeError("pg_restore produced no SQL output")
    await _run_psql(_filter_sql(sql_output))


async def _restore_sql(filepath: str) -> None:
    with open(filepath, "rb") as f:
        sql_content = f.read()
    await _run_psql(_filter_sql(sql_content))


async def _restore_job(job_id: str, filepath: str) -> None:
    try:
        if filepath.endswith(".dump"):
            await _restore_dump(filepath)
        else:
            await _restore_sql(filepath)
        _restore_jobs[job_id]["status"] = "completed"
        _restore_jobs[job_id]["message"] = "Restauration terminee avec succes"
    except Exception as e:
        _restore_jobs[job_id]["status"] = "failed"
        _restore_jobs[job_id]["message"] = str(e)
    finally:
        _restore_jobs[job_id]["finished_at"] = datetime.now().isoformat()


async def start_restore_job(filename: str, source: str = "backups") -> tuple[str, str]:
    """Launch an async restore task.  Returns ``(job_id, filepath)``."""
    base = demo_dir() if source == "demos" else backup_dir()
    filepath = os.path.join(base, filename)

    job_id = str(uuid.uuid4())
    _restore_jobs[job_id] = {
        "id": job_id,
        "type": "restore",
        "status": "running",
        "message": f"Restauration de {filename}...",
        "filename": filename,
        "started_at": datetime.now().isoformat(),
        "finished_at": None,
    }

    asyncio.create_task(_restore_job(job_id, filepath))
    return job_id, filepath


def get_restore_jobs() -> dict[str, dict]:
    return _restore_jobs
