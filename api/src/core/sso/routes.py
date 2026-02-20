"""SSO parent routes: list providers, list/unlink SSO accounts."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..security import get_current_user
from .models import SSOAccount
from .schemas import SSOAccountResponse, SSOProviderInfo, SSOProvidersResponse

router = APIRouter()


@router.get("/providers", response_model=SSOProvidersResponse)
async def list_providers(request: Request):
    """Liste des fournisseurs SSO disponibles et leur statut."""
    registry = request.app.state.feature_registry
    providers = []

    # Check Google SSO
    google_active = registry.is_active("sso.google")
    providers.append(SSOProviderInfo(
        name="google",
        label="Google",
        enabled=google_active,
    ))

    # Check GitHub SSO
    github_active = registry.is_active("sso.github")
    providers.append(SSOProviderInfo(
        name="github",
        label="GitHub",
        enabled=github_active,
    ))

    return SSOProvidersResponse(providers=providers)


@router.get("/accounts", response_model=list[SSOAccountResponse])
async def list_sso_accounts(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste des comptes SSO lies a l'utilisateur connecte."""
    result = await db.execute(
        select(SSOAccount).where(SSOAccount.user_id == current_user.id)
    )
    accounts = result.scalars().all()
    return [
        SSOAccountResponse(
            id=acc.id,
            provider=acc.provider,
            provider_email=acc.provider_email,
            provider_name=acc.provider_name,
            provider_avatar_url=acc.provider_avatar_url,
            created_at=acc.created_at,
            last_login_at=acc.last_login_at,
        )
        for acc in accounts
    ]


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink_sso_account(
    account_id: int,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delie un compte SSO de l'utilisateur connecte."""
    result = await db.execute(
        select(SSOAccount).where(
            SSOAccount.id == account_id,
            SSOAccount.user_id == current_user.id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Compte SSO introuvable",
        )

    # Verifier que l'utilisateur a un mot de passe ou d'autres comptes SSO
    # avant de supprimer le dernier lien SSO
    other_accounts_result = await db.execute(
        select(SSOAccount).where(
            SSOAccount.user_id == current_user.id,
            SSOAccount.id != account_id,
        )
    )
    other_accounts = other_accounts_result.scalars().all()

    if not current_user.password_hash and len(other_accounts) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de supprimer le dernier moyen de connexion. "
                   "Definissez un mot de passe avant de delier ce compte SSO.",
        )

    await db.delete(account)
    await db.flush()
