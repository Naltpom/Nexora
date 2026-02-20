"""Google OAuth2 service: authorization URL generation and code exchange."""

from urllib.parse import urlencode

import httpx

from ....core.config import settings

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


async def get_google_authorize_url(state: str | None = None) -> str:
    """Build Google OAuth2 authorization URL with scope=openid email profile."""
    params = {
        "client_id": settings.SSO_GOOGLE_CLIENT_ID,
        "redirect_uri": settings.SSO_GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_google_code(code: str) -> dict:
    """Exchange authorization code for tokens, then fetch user info.

    Returns dict with: provider_user_id, email, first_name, last_name, avatar_url.
    """
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.SSO_GOOGLE_CLIENT_ID,
                "client_secret": settings.SSO_GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.SSO_GOOGLE_REDIRECT_URI,
            },
        )
        token_response.raise_for_status()
        token_data = token_response.json()

        # Fetch user info
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo_response.raise_for_status()
        userinfo = userinfo_response.json()

        return {
            "provider_user_id": userinfo["sub"],
            "email": userinfo.get("email", ""),
            "first_name": userinfo.get("given_name", ""),
            "last_name": userinfo.get("family_name", ""),
            "avatar_url": userinfo.get("picture"),
        }
