# mfa.email — OTP par email

## Vue d'ensemble

Feature enfant de `mfa`, depend de `notification.email`. Fournit un MFA par code OTP numerique (6 chiffres par defaut) envoye par SMTP.

## Architecture

### Backend (`api/src/core/mfa/email/`)

| Fichier | Role |
|---------|------|
| `manifest.py` | Metadata feature : `mfa.email`, parent `mfa`, depends `notification.email` |
| `routes.py` | 4 endpoints (enable, send-code, send-disable-code, disable) |
| `services.py` | Generation OTP, persistance hashee, verification, envoi SMTP |

### Frontend (integre dans `app/src/core/mfa/`)

| Fichier | Role |
|---------|------|
| `MFASetupPage.tsx` | Section email : activation, desactivation avec code de confirmation |
| `MFAVerifyPage.tsx` | Verification email pendant le login (envoi code + saisie) |
| `mfa.scss` | Styles `.mfa-email-prompt`, `.mfa-resend-btn` |
| `i18n/fr.json` | Traductions FR (cles `setup_email_*`, `verify_email_*`) |
| `i18n/en.json` | Stubs EN |

### Modele DB

**Table `mfa_email_codes`** (migration `4697edebaaa0`) :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | int PK | Auto-increment |
| `user_id` | int FK → users | CASCADE on delete |
| `code_hash` | varchar(255) | OTP hashe (bcrypt) |
| `expires_at` | datetime(tz) | Expiration du code |
| `is_used` | bool | Single-use enforcement |
| `created_at` | datetime(tz) | Date de creation |

**Dans `user_mfa`** (shared avec TOTP) :
- `method = "email"`
- `email_address` : adresse email utilisee pour l'envoi
- `is_enabled`, `is_primary` : etat de la methode

## Endpoints

| Endpoint | Methode | Auth | Permission | Rate limit | Description |
|----------|---------|------|------------|------------|-------------|
| `/api/mfa/email/enable` | POST | JWT | `mfa.email.setup` | — | Activer email MFA + generer backup codes |
| `/api/mfa/email/send-code` | POST | mfa_token | — | `RATE_LIMIT_MFA_VERIFY` | Envoyer OTP pendant le login |
| `/api/mfa/email/send-disable-code` | POST | JWT | `mfa.email.setup` | `RATE_LIMIT_MFA_VERIFY` | Envoyer OTP pour confirmer desactivation |
| `/api/mfa/email/disable` | POST | JWT | `mfa.email.setup` | — | Desactiver (necessite code valide) |

## Permission

| Code | Scope | Usage |
|------|-------|-------|
| `mfa.email.setup` | GlobalPermission | Enable/disable email MFA (user-facing) |

## Events emis

| Event | Quand |
|-------|-------|
| `mfa.email_enabled` | User active email MFA |
| `mfa.email_disabled` | User desactive email MFA |

## Configuration

| Variable | Defaut | Description |
|----------|--------|-------------|
| `MFA_EMAIL_CODE_LENGTH` | `6` | Nombre de chiffres du code OTP |
| `MFA_EMAIL_CODE_EXPIRY_MINUTES` | `5` | Duree de validite du code |
| `EMAIL_ENABLED` | `false` | Master switch SMTP (doit etre `true`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | — | Config SMTP |

## Flux d'activation

1. User va sur `/profile/mfa`
2. Clique "Activer" dans la section Email
3. `POST /api/mfa/email/enable` → verifie `EMAIL_ENABLED`, cree `UserMFA(method="email")`, genere backup codes
4. Frontend affiche les backup codes (composant `MFABackupCodes`)

## Flux de verification (login)

1. Login classique → `mfa_required=True` avec `methods=["email"]`
2. Frontend redirige vers `/mfa/verify`, affiche bouton "Envoyer le code"
3. `POST /api/mfa/email/send-code` avec `mfa_token` → genere OTP, hash en DB, envoie par SMTP
4. User saisit le code recu par email
5. `POST /api/mfa/verify` avec `method="email"` → dispatch vers `verify_email_otp()`
6. Code verifie (hash match + non expire + non utilise) → session creee

## Flux de desactivation

1. User clique "Desactiver" → `POST /api/mfa/email/send-disable-code`
2. Code envoye par email, UI affiche champ de saisie
3. User entre le code → `POST /api/mfa/email/disable` avec le code
4. Code verifie → `is_enabled=False`, `is_primary=False`

## Securite

- Codes OTP hashes en DB (bcrypt), jamais stockes en clair
- Codes single-use (`is_used=True` apres verification)
- Codes expirables (5 min par defaut)
- Anciens codes non utilises supprimes a chaque nouvel envoi
- Rate limit sur les endpoints d'envoi
- Verification `EMAIL_ENABLED` avant activation (empeche le lock-out)
- Echec SMTP propage en HTTP 502 (pas de faux "code envoye")

## Bugs corriges (revue v2026.02.38)

| # | Severite | Description | Fix |
|---|----------|-------------|-----|
| 1 | HIGH | `require_permission("mfa.email.setup")` manquant sur `/enable`, `/send-disable-code`, `/disable` | Ajout du decorator sur les 3 endpoints |
| 2 | HIGH | Pas de check `EMAIL_ENABLED` avant activation → lock-out possible | Check + HTTP 400 si email non configure |
| 3 | MEDIUM | `send_email_otp()` ignore le retour de `send_verification_code()` | Propagation erreur en HTTP 502 |
| 4 | MEDIUM | Frontend ne capture pas les backup codes a l'activation email | `setBackupCodes(res.data.codes)` ajoute |
