"""Parent MFA routes: status, verify, disable, backup codes, methods, policies."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .._identity.models import Role, User, UserRole
from ..config import settings
from ..database import get_db
from ..permissions import require_permission
from ..rate_limit import limiter
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_mfa_token,
    get_current_user,
    verify_password,
)
from .models import MFABackupCode, MFARolePolicy, UserMFA
from .schemas import (
    BackupCodesResponse,
    MFADisableRequest,
    MFAMethodInfo,
    MFAMethodsResponse,
    MFAPolicyRequest,
    MFAPolicyResponse,
    MFAStatusResponse,
    MFAVerifyRequest,
    MFAVerifyResponse,
)
from .services import (
    generate_backup_codes,
    get_backup_codes_count,
    is_mfa_required_for_user,
    verify_mfa_code,
)

router = APIRouter()


# -- Status --------------------------------------------------------------------


@router.get("/status", response_model=MFAStatusResponse)
async def get_mfa_status(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recuperer le statut MFA de l'utilisateur courant."""
    # Get enabled methods
    result = await db.execute(
        select(UserMFA).where(UserMFA.user_id == current_user.id)
    )
    user_methods = result.scalars().all()
    enabled_methods = [m for m in user_methods if m.is_enabled]

    methods = [
        {"method": m.method, "is_enabled": m.is_enabled, "is_primary": m.is_primary}
        for m in user_methods
    ]

    # Backup codes count
    backup_count = await get_backup_codes_count(db, current_user.id)

    # Check role policy
    mfa_info = await is_mfa_required_for_user(db, current_user)
    mfa_required_by_policy = mfa_info.get("mfa_setup_required", False)
    grace_period_expires = None

    if mfa_required_by_policy and not enabled_methods:
        # Calculate grace period expiration
        result = await db.execute(
            select(MFARolePolicy)
            .join(UserRole, UserRole.role_id == MFARolePolicy.role_id)
            .where(UserRole.user_id == current_user.id, MFARolePolicy.mfa_required == True)
        )
        policy = result.scalars().first()
        if policy and current_user.created_at:
            from datetime import timedelta
            grace_period_expires = current_user.created_at + timedelta(days=policy.grace_period_days)

    return MFAStatusResponse(
        is_mfa_enabled=len(enabled_methods) > 0,
        methods=methods,
        backup_codes_remaining=backup_count,
        mfa_required_by_policy=mfa_required_by_policy,
        mfa_setup_required=mfa_required_by_policy and len(enabled_methods) == 0,
        grace_period_expires=grace_period_expires,
    )


# -- Verify (Public, uses mfa_token) ------------------------------------------


@router.post("/verify", response_model=MFAVerifyResponse)
@limiter.limit(settings.RATE_LIMIT_MFA_VERIFY)
async def verify_mfa(
    data: MFAVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Verifier un code MFA pendant le login et retourner les vrais tokens."""
    payload = decode_mfa_token(data.mfa_token)
    user_id = int(payload["sub"])

    # Verify the code
    is_valid = await verify_mfa_code(db, user_id, data.code, data.method)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code MFA invalide",
        )

    # Fetch user to build tokens
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable",
        )

    token_data = {"sub": str(user.id), "email": user.email, "lang": user.language}
    preferences = json.loads(user.preferences) if user.preferences else None

    return MFAVerifyResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        must_change_password=user.must_change_password,
        preferences=preferences,
    )


# -- Disable -------------------------------------------------------------------


@router.post("/disable")
async def disable_mfa(
    request: MFADisableRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Desactiver toutes les methodes MFA. Necessite la confirmation du mot de passe."""
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de desactiver le MFA pour un compte sans mot de passe",
        )

    if not verify_password(request.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe incorrect",
        )

    # Disable all MFA methods
    result = await db.execute(
        select(UserMFA).where(UserMFA.user_id == current_user.id)
    )
    for mfa_method in result.scalars().all():
        mfa_method.is_enabled = False
        mfa_method.is_primary = False

    # Delete all backup codes
    await db.execute(
        delete(MFABackupCode).where(MFABackupCode.user_id == current_user.id)
    )
    await db.flush()

    return {"ok": True, "message": "MFA desactive avec succes"}


# -- Backup Codes --------------------------------------------------------------


@router.post("/backup-codes/generate", response_model=BackupCodesResponse)
async def generate_backup_codes_endpoint(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generer 10 nouveaux codes de secours (remplace les anciens)."""
    # Check that MFA is enabled
    result = await db.execute(
        select(UserMFA).where(
            UserMFA.user_id == current_user.id, UserMFA.is_enabled == True
        )
    )
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous devez activer le MFA avant de generer des codes de secours",
        )

    codes = await generate_backup_codes(db, current_user.id)
    return BackupCodesResponse(
        codes=codes,
        generated_at=datetime.now(timezone.utc),
    )


@router.get("/backup-codes/count")
async def get_backup_codes_count_endpoint(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recuperer le nombre de codes de secours restants."""
    count = await get_backup_codes_count(db, current_user.id)
    return {"count": count}


# -- Available Methods ---------------------------------------------------------


@router.get("/methods", response_model=MFAMethodsResponse)
async def list_available_methods(request: Request):
    """Lister les methodes MFA disponibles (selon les sub-features actives)."""
    registry = request.app.state.feature_registry
    methods = []
    if registry.is_active("mfa.totp"):
        methods.append(MFAMethodInfo(
            name="totp",
            label="Application Authenticator (TOTP)",
            enabled=True,
        ))
    if registry.is_active("mfa.email"):
        methods.append(MFAMethodInfo(
            name="email",
            label="Code par email",
            enabled=True,
        ))
    return MFAMethodsResponse(methods=methods)


# -- Policies (Admin) ---------------------------------------------------------


@router.get(
    "/policy",
    response_model=list[MFAPolicyResponse],
    dependencies=[Depends(require_permission("mfa.manage"))],
)
async def list_policies(
    db: AsyncSession = Depends(get_db),
):
    """Lister toutes les policies MFA par role."""
    result = await db.execute(
        select(MFARolePolicy, Role).join(Role, Role.id == MFARolePolicy.role_id)
    )
    policies = []
    for policy, role in result.all():
        policies.append(
            MFAPolicyResponse(
                role_id=policy.role_id,
                role_name=role.name,
                mfa_required=policy.mfa_required,
                allowed_methods=policy.allowed_methods,
                grace_period_days=policy.grace_period_days,
                created_at=policy.created_at,
                updated_at=policy.updated_at,
            )
        )
    return policies


@router.put(
    "/policy/{role_id}",
    response_model=MFAPolicyResponse,
    dependencies=[Depends(require_permission("mfa.manage"))],
)
async def set_policy(
    role_id: int,
    data: MFAPolicyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Definir ou mettre a jour la policy MFA pour un role."""
    # Verify role exists
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role introuvable",
        )

    # Find or create policy
    result = await db.execute(
        select(MFARolePolicy).where(MFARolePolicy.role_id == role_id)
    )
    policy = result.scalar_one_or_none()

    if policy:
        policy.mfa_required = data.mfa_required
        policy.allowed_methods = data.allowed_methods
        policy.grace_period_days = data.grace_period_days
    else:
        policy = MFARolePolicy(
            role_id=role_id,
            mfa_required=data.mfa_required,
            allowed_methods=data.allowed_methods,
            grace_period_days=data.grace_period_days,
        )
        db.add(policy)

    await db.flush()

    return MFAPolicyResponse(
        role_id=policy.role_id,
        role_name=role.name,
        mfa_required=policy.mfa_required,
        allowed_methods=policy.allowed_methods,
        grace_period_days=policy.grace_period_days,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )


@router.delete(
    "/policy/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("mfa.manage"))],
)
async def delete_policy(
    role_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Supprimer la policy MFA pour un role."""
    result = await db.execute(
        select(MFARolePolicy).where(MFARolePolicy.role_id == role_id)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy MFA introuvable pour ce role",
        )
    await db.delete(policy)
    await db.flush()
