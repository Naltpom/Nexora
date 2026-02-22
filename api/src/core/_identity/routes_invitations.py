"""Invitation management endpoints."""

import random
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)
from .models import Invitation, User
from .schemas import (
    InvitationAccept,
    InvitationCreate,
    InvitationListResponse,
    InvitationTokenResponse,
    InvitationValidateResponse,
    InvitationVerify,
)
from .services import (
    find_pending_invitation,
    create_security_token,
    verify_security_token,
    consume_security_token,
    get_latest_security_token,
)
from ..events import event_bus

router = APIRouter()


def _generate_verification_code() -> str:
    return str(random.randint(100000, 999999))


# ---------------------------------------------------------------------------
#  Admin endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/invite",
    response_model=InvitationListResponse,
    dependencies=[Depends(require_permission("invitations.create"))],
)
async def create_invitation(
    data: InvitationCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create an invitation and send email to the invitee."""
    email = data.email.lower()

    # Check for existing pending invitation
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation).where(
            Invitation.email == email,
            Invitation.consumed_at.is_(None),
            Invitation.expires_at > now,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Une invitation est deja en attente pour cet email")

    # Check if user already exists
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cet utilisateur existe deja sur la plateforme")

    token = str(uuid.uuid4())
    invited_by_name = f"{current_user.first_name} {current_user.last_name}"

    invitation = Invitation(
        invited_by_id=current_user.id,
        email=email,
        token_hash=hash_password(token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=48),
    )
    db.add(invitation)
    await db.flush()

    # Send email (optional dependency)
    try:
        from ..notification.email.services import get_email_sender

        sender = get_email_sender()
        sender.send_invitation(
            to_email=email,
            invited_by_name=invited_by_name,
            invitation_token=token,
        )
    except Exception:
        pass

    await event_bus.emit(
        "user.invited",
        db=db,
        actor_id=current_user.id,
        resource_type="invitation",
        resource_id=invitation.id,
        payload={
            "actor_name": invited_by_name,
            "invited_email": email,
        },
    )

    return InvitationListResponse(
        id=invitation.id,
        email=invitation.email,
        invited_by_name=invited_by_name,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
    )


@router.get(
    "/invitations",
    response_model=list[InvitationListResponse],
    dependencies=[Depends(require_permission("invitations.read"))],
)
async def list_invitations(
    db: AsyncSession = Depends(get_db),
):
    """List pending invitations."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Invitation).where(
            Invitation.consumed_at.is_(None),
            Invitation.expires_at > now,
        )
    )
    invitations = result.scalars().all()

    # Resolve inviter names
    inviter_ids = {inv.invited_by_id for inv in invitations if inv.invited_by_id}
    inviter_names: dict[int, str] = {}
    if inviter_ids:
        result = await db.execute(select(User).where(User.id.in_(inviter_ids)))
        for u in result.scalars().all():
            inviter_names[u.id] = f"{u.first_name} {u.last_name}"

    return [
        InvitationListResponse(
            id=inv.id,
            email=inv.email,
            invited_by_name=inviter_names.get(inv.invited_by_id),
            created_at=inv.created_at,
            expires_at=inv.expires_at,
        )
        for inv in invitations
    ]


@router.delete(
    "/invitations/{invitation_id}",
    status_code=204,
    dependencies=[Depends(require_permission("invitations.delete"))],
)
async def cancel_invitation(
    invitation_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending invitation."""
    result = await db.execute(select(Invitation).where(Invitation.id == invitation_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation introuvable")
    await db.delete(inv)
    await db.flush()


# ---------------------------------------------------------------------------
#  Public endpoints
# ---------------------------------------------------------------------------


@router.get("/invitations/{token}", response_model=InvitationValidateResponse)
async def validate_invitation(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Validate an invitation token and return info."""
    inv = await find_pending_invitation(db, token)

    result = await db.execute(select(User).where(User.email == inv.email))
    existing_user = result.scalar_one_or_none()

    invited_by_name = None
    if inv.invited_by_id:
        result = await db.execute(select(User).where(User.id == inv.invited_by_id))
        inviter = result.scalar_one_or_none()
        if inviter:
            invited_by_name = f"{inviter.first_name} {inviter.last_name}"

    return InvitationValidateResponse(
        invited_by_name=invited_by_name,
        email=inv.email,
        user_exists=existing_user is not None,
        expires_at=inv.expires_at,
    )


@router.post("/invitations/{token}/accept")
async def accept_invitation(
    token: str,
    data: InvitationAccept,
    db: AsyncSession = Depends(get_db),
):
    """Accept an invitation -- authenticate existing user or create new account."""
    inv = await find_pending_invitation(db, token)

    result = await db.execute(select(User).where(User.email == inv.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if not existing_user.password_hash:
            raise HTTPException(status_code=400, detail="Ce compte utilise une autre methode d'authentification")
        if not verify_password(data.password, existing_user.password_hash):
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")
        if not existing_user.is_active:
            raise HTTPException(status_code=401, detail="Ce compte est desactive")
        user = existing_user
    else:
        if not data.first_name or not data.last_name:
            raise HTTPException(status_code=400, detail="Prenom et nom requis")
        if len(data.password) < 6:
            raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caracteres")
        user = User(
            email=inv.email,
            password_hash=hash_password(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            auth_source="local",
            is_active=False,  # Activated after code verification
        )
        db.add(user)
        await db.flush()

    # Generate and send verification code
    code = _generate_verification_code()
    inv.user_id = user.id
    await db.flush()
    await create_security_token(db, user.id, "invitation_verification", code, expires_minutes=5)

    try:
        from ..notification.email.services import get_email_sender

        sender = get_email_sender()
        sender.send_verification_code(
            to_email=inv.email,
            to_name=user.first_name,
            verification_code=code,
        )
    except Exception:
        pass

    return {"message": "Code de verification envoye par email", "email": inv.email}


@router.post("/invitations/{token}/send-code")
async def resend_verification_code(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Resend verification code (with 60s cooldown)."""
    inv = await find_pending_invitation(db, token)

    if not inv.user_id:
        raise HTTPException(status_code=400, detail="Aucun utilisateur associe a cette invitation")

    # Cooldown check via SecurityToken
    latest = await get_latest_security_token(db, inv.user_id, "invitation_verification")
    if latest:
        elapsed = (datetime.now(timezone.utc) - latest.created_at).total_seconds()
        if elapsed < 60:
            remaining = int(60 - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Veuillez attendre {remaining} secondes avant de renvoyer un code",
            )

    code = _generate_verification_code()
    await create_security_token(db, inv.user_id, "invitation_verification", code, expires_minutes=5)

    # Get user name for the email
    user_name = ""
    result = await db.execute(select(User).where(User.id == inv.user_id))
    user = result.scalar_one_or_none()
    if user:
        user_name = user.first_name

    try:
        from ..notification.email.services import get_email_sender

        sender = get_email_sender()
        sender.send_verification_code(
            to_email=inv.email,
            to_name=user_name,
            verification_code=code,
        )
    except Exception:
        pass

    return {"message": "Code de verification renvoye"}


@router.post("/invitations/{token}/verify", response_model=InvitationTokenResponse)
async def verify_invitation_code(
    token: str,
    data: InvitationVerify,
    db: AsyncSession = Depends(get_db),
):
    """Verify code and finalize invitation acceptance."""
    inv = await find_pending_invitation(db, token)

    if not inv.user_id:
        raise HTTPException(status_code=400, detail="Aucun utilisateur associe a cette invitation")

    sec_token = await verify_security_token(db, data.code, "invitation_verification", user_id=inv.user_id)
    if not sec_token:
        raise HTTPException(status_code=400, detail="Code incorrect ou expire")

    result = await db.execute(select(User).where(User.id == inv.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable")

    if not user.is_active:
        user.is_active = True

    await consume_security_token(db, sec_token)
    inv.consumed_at = datetime.now(timezone.utc)
    await db.flush()

    await event_bus.emit(
        "user.invitation_accepted",
        db=db,
        actor_id=user.id,
        resource_type="user",
        resource_id=user.id,
        payload={
            "actor_name": f"{user.first_name} {user.last_name}",
            "member_name": f"{user.first_name} {user.last_name}",
            "email": user.email,
        },
    )

    token_data = {"sub": str(user.id), "email": user.email, "lang": user.language}
    return InvitationTokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )
