"""GitHub OAuth2 service: authorization URL generation and code exchange."""

from urllib.parse import urlencode

import httpx

from ...config import settings

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USERINFO_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


async def get_github_authorize_url(state: str | None = None) -> str:
    """Build GitHub OAuth2 authorization URL with scope=read:user user:email."""
    params = {
        "client_id": settings.SSO_GITHUB_CLIENT_ID,
        "redirect_uri": settings.SSO_GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
    }
    if state:
        params["state"] = state
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_github_code(code: str) -> dict:
    """Exchange authorization code for tokens, then fetch user info.

    Returns dict with: provider_user_id, email, first_name, last_name, avatar_url.
    """
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.SSO_GITHUB_CLIENT_ID,
                "client_secret": settings.SSO_GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_response.raise_for_status()
        token_data = token_response.json()

        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Pas de token d'acces dans la reponse GitHub")

        auth_headers = {"Authorization": f"Bearer {access_token}"}

        # Fetch user profile
        userinfo_response = await client.get(
            GITHUB_USERINFO_URL,
            headers=auth_headers,
        )
        userinfo_response.raise_for_status()
        userinfo = userinfo_response.json()

        # GitHub uses "id" (integer) as provider_user_id
        provider_user_id = str(userinfo["id"])

        # Extract email from profile, fallback to /user/emails endpoint
        email = userinfo.get("email") or ""
        if not email:
            emails_response = await client.get(
                GITHUB_EMAILS_URL,
                headers=auth_headers,
            )
            if emails_response.status_code == 200:
                emails = emails_response.json()
                # Prefer primary verified email
                for e in emails:
                    if e.get("primary") and e.get("verified"):
                        email = e["email"]
                        break
                # Fallback to any verified email
                if not email:
                    for e in emails:
                        if e.get("verified"):
                            email = e["email"]
                            break

        # Split name into first_name / last_name (best effort)
        name = userinfo.get("name") or userinfo.get("login") or ""
        parts = name.strip().split(" ", 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

        return {
            "provider_user_id": provider_user_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "avatar_url": userinfo.get("avatar_url"),
        }
