# Feature : sso

## Vue d'ensemble

Feature parent pour l'authentification OAuth2 via fournisseurs externes. Gere le modele `SSOAccount`, les endpoints de listing/deliaison, et le service partage de creation/liaison d'utilisateurs.

**Type** : parent (children : `sso.github`, `sso.google`)
**Dependances** : `_identity` (User model, security, auth)
**Permissions** : `sso.link` (GlobalPermission — tout user authentifie)
**Events** : 8 types declares dans le manifest

## Architecture

```
api/src/core/sso/
  manifest.py         # Feature parent, 1 permission, 8 event types
  models.py           # SSOAccount (FK users, unique provider+user_id)
  schemas.py          # SSOAuthorize/Callback/Account/Provider schemas
  routes.py           # GET /providers, GET /accounts, DELETE /accounts/{id}
  services.py         # find_or_create_user_from_sso, issue_tokens_for_sso_user
  github/             # Child feature sso.github
  google/             # Child feature sso.google

app/src/core/sso/
  index.ts            # Manifest frontend + tutorial
  SSOButtons.tsx      # Boutons login page (Google/GitHub)
  SSOCallbackPage.tsx # Page callback OAuth2 (/sso/callback/:provider)
  SSOAccountLinks.tsx # Gestion comptes lies (profile page)
  sso.scss            # Styles dark/light
  i18n/fr.json        # 23 cles FR
  i18n/en.json        # 23 cles EN
```

## Backend

### Modele — `SSOAccount`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | int PK | Identifiant |
| `user_id` | FK users.id (CASCADE) | Utilisateur lie |
| `provider` | String(50) | Nom du provider (`google`, `github`) |
| `provider_user_id` | String(255) | ID chez le provider |
| `provider_email` | String(255)? | Email chez le provider |
| `provider_name` | String(255)? | Nom affiche |
| `provider_avatar_url` | String(500)? | URL avatar |
| `created_at` | DateTime(tz) | Date de creation |
| `last_login_at` | DateTime(tz)? | Derniere connexion |

**Contraintes** :
- `uq_sso_provider_user` : un provider_user_id unique par provider
- `uq_sso_user_provider` : un seul compte par provider par user

### Routes parent (`/api/sso`)

| Methode | Endpoint | Auth | Permission | Description |
|---------|----------|------|------------|-------------|
| GET | `/providers` | Non | Aucune | Liste providers + statut (public, login page) |
| GET | `/accounts` | Oui | `sso.link` | Comptes SSO lies au user courant |
| DELETE | `/accounts/{id}` | Oui | `sso.link` | Delier un compte SSO |

**Garde de securite sur DELETE** : empeche de delier le dernier moyen de connexion (pas de password + pas d'autres comptes SSO). Emet `sso.unlink_blocked` si refuse, `sso.account_unlinked` si reussi.

### Services partages

#### `find_or_create_user_from_sso(db, provider, provider_user_id, email, ...)`

Logique en 3 etapes :

1. **SSOAccount existant** (provider + provider_user_id) → met a jour last_login, retourne user
2. **User existant par email** → auto-link, cree SSOAccount, retourne user
3. **Aucun** → cree User (`auth_source=provider`, `email_verified=True`, `email_verified_at=now`, `password_hash=None`) + SSOAccount

**Securite** :
- Etape 2 bloque si le user existant est `is_active=False` ou `deleted_at IS NOT NULL` (HTTP 403)
- L'email est considere comme verifie par le provider OAuth2 (pas de double verification)

#### `issue_tokens_for_sso_user(db, user)`

Emet des JWT tokens pour un user SSO. Avant emission :
- Verifie `is_active` et `deleted_at` (HTTP 403 si desactive/supprime)
- Check MFA via import dynamique (pas de hard dependency sur `mfa`)

### Events (8 types)

| Event type | Contexte | Trigger |
|---|---|---|
| `sso.login` | callback | Connexion SSO reussie |
| `sso.user_created` | callback | Nouveau user cree (premiere connexion SSO) |
| `sso.account_linked` | link / auto-link | Compte SSO lie (manuellement depuis profil ou auto-link par email au callback) |
| `sso.account_unlinked` | parent DELETE | Compte SSO delie |
| `sso.link_rejected` | link | Compte provider deja lie a un autre user |
| `sso.unlink_blocked` | parent DELETE | Dernier moyen de connexion, deliaison refusee |
| `sso.login_failed` | callback | Echange code echoue (logger.warning, pas d'event DB — pas de user) |
| `sso.link_failed` | link | Echange code echoue (user authentifie → event DB) |

**Note** : `sso.login_failed` est logue via `logger.warning` et non via `event_bus.emit` car `actor_id` est un FK non-nullable vers `users.id` et il n'y a pas de user identifie a ce stade.

## Frontend

### SSOButtons

Affiche sur la page de login quand `isActive('sso')` est true. Fetch `GET /sso/providers`, filtre les actifs, genere des boutons avec les icones SVG Google/GitHub. Gere loading state et erreurs.

### SSOCallbackPage

Route : `/sso/callback/:provider`. Recoit le code OAuth2 via query params. Gere :
- **Login flow** (`action=login` dans le state JWT) : echange code → tokens → `loginWithSSO()` → redirect `/` (ou `/mfa/verify` si MFA requis, ou `/mfa/force-setup` si grace period expiree)
- **Link flow** (`action=link` dans le state JWT) : echange code → `POST /link` → redirect `/profile`

**Protection StrictMode** : module-level `processedCodes` Set empeche le double-submit du meme code OAuth2.

### SSOAccountLinks

Section profile page. Affiche les comptes SSO lies avec avatar, email, date de liaison. Permet de delier (avec confirmation) et de lier de nouveaux providers non encore lies.

**Note** : `formatDate` utilise `i18n.language` pour le formatage localise des dates.

## Flux complets

### Login SSO (premiere connexion)

```
LoginPage → SSOButtons → GET /sso/{provider}/authorize
  → redirect OAuth provider → callback avec ?code=...&state=...
  → SSOCallbackPage → POST /sso/{provider}/callback
    → exchange_code() → user_info
    → find_or_create_user_from_sso() → nouveau User + SSOAccount
    → issue_tokens_for_sso_user() → JWT tokens
    → events: sso.login + sso.user_created
  → loginWithSSO(access_token, refresh_token)
  → redirect /
```

### Login SSO (user existant)

```
idem mais find_or_create_user_from_sso() trouve le SSOAccount existant
  → met a jour last_login_at → retourne user
  → event: sso.login uniquement
```

### Link SSO (depuis profil)

```
ProfilePage → SSOAccountLinks → GET /sso/{provider}/authorize?link=true
  → redirect OAuth provider → callback avec ?code=...&state=...
  → SSOCallbackPage detecte action=link dans le state JWT
  → POST /sso/{provider}/link (auth required)
    → verifie que le compte provider n'est pas deja lie
    → cree SSOAccount
    → event: sso.account_linked
  → redirect /profile
```

### Unlink SSO

```
ProfilePage → SSOAccountLinks → DELETE /sso/accounts/{id}
  → verifie ownership (user_id == current_user.id)
  → verifie pas le dernier moyen de connexion
  → supprime SSOAccount
  → event: sso.account_unlinked
```

## Corrections appliquees (revue v2026.02.34)

| # | Severite | Description | Fix |
|---|----------|-------------|-----|
| 1 | MEDIUM | `border-radius` hardcode en px | `var(--radius)` dans sso.scss |
| 2 | LOW | `formatDate` hardcode `fr-FR` | `i18n.language` dans SSOAccountLinks |
| 3 | MEDIUM | Pas d'events emis | 8 event types + emissions dans toutes les routes |
| 4 | LOW | Permission `sso.link` jamais enforced | `require_permission` sur GET/DELETE accounts |
| 5 | LOW | Padding boutons en px fixe | `var(--density-btn-padding)` dans sso.scss |
| 6 | LOW | User inactive peut se connecter via SSO | Check `is_active` + `deleted_at` dans services |
| C | MEDIUM | Auto-link SSO sur compte desactive | Block dans `find_or_create_user_from_sso` |
| + | LOW | Pas de `email_verified_at` | Champ ajoute au modele User + migration + usages |

## Corrections appliquees (revue v2026.02.35)

| # | Severite | Description | Fix |
|---|----------|-------------|-----|
| 1 | MEDIUM | Permission `sso.link` manquante sur `/link` (google + github) | `dependencies=[Depends(require_permission("sso.link"))]` |
| 2 | MEDIUM | State validation `except Exception` avale HTTPException | `except JWTError` + check provider hors du try/except |
| 3 | MEDIUM | IP manquante dans payload `sso.login` Google | `ip` capture en debut de callback, ajoute au payload |
| 4 | MEDIUM | Permissions `sso.google.login` / `sso.github.login` mortes | Retirees des manifests (endpoints publics, pas de check) |
| 5 | LOW | Auto-link email sans event `sso.account_linked` | Emission dans `find_or_create_user_from_sso` avec `auto_linked: true` |
| 6 | LOW | `window.confirm()` non localise | Remplace par `useConfirm()` (ConfirmModal i18n) |
| 7 | LOW | Cles i18n inutilisees | `continuer_avec_google` / `continuer_avec_github` supprimees |
