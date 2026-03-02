# Securite

## Checklist avant mise en production

### Serveur

- [ ] SSH par cle uniquement (desactiver `PasswordAuthentication` dans `/etc/ssh/sshd_config`)
- [ ] fail2ban installe et actif
- [ ] Firewall actif (ufw/firewalld) : seuls 22, 80, 443 ouverts
- [ ] Mises a jour automatiques activees (`unattended-upgrades` sur Ubuntu)
- [ ] Utilisateur non-root pour Docker (pas de `sudo docker`)

### Secrets

- [ ] `SECRET_KEY` genere (64 hex) — `openssl rand -hex 64`
- [ ] `ENCRYPTION_KEY` genere (Fernet) — `python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'`
- [ ] `POSTGRES_PASSWORD` genere (32 hex) — `openssl rand -hex 32`
- [ ] `REDIS_PASSWORD` genere (32 hex)
- [ ] `MEILISEARCH_MASTER_KEY` genere (32 hex)
- [ ] `SMTP_PASSWORD` configure (si email active)
- [ ] Tous les fichiers dans `./secrets/` ont les permissions `600`
- [ ] Le dossier `secrets/` est dans `.gitignore`

### Application

- [ ] `ENV=production` dans `.env` (active les validations de securite au demarrage)
- [ ] `FRONTEND_URL` et `CORS_ORIGINS` pointent vers le vrai domaine HTTPS
- [ ] Swagger/OpenAPI desactive en production (automatique quand `ENV != dev`)
- [ ] `RATE_LIMIT_ENABLED=true`
- [ ] `ANTIVIRUS_ENABLED=true` (si uploads utilisateurs actives)

### Reseau

- [ ] HTTPS force (redirection HTTP → HTTPS via Nginx)
- [ ] Aucun port interne expose (DB, Redis, Meilisearch, API, App = `ports: []` dans compose prod)
- [ ] Seuls ports 80/443 accessibles depuis l'exterieur
- [ ] Headers de securite actifs (HSTS, CSP, X-Frame-Options — geres par Nginx + API middleware)

---

## Docker Secrets

Les secrets sensibles ne sont **jamais** dans les variables d'environnement Docker.
Ils sont montes en fichiers dans `/run/secrets/` a l'interieur des containers.

| Fichier | Service | Usage |
|---------|---------|-------|
| `secrets/secret_key` | api, worker | JWT signing |
| `secrets/encryption_key` | api, worker | Chiffrement Fernet des donnees sensibles |
| `secrets/postgres_password` | api, worker, pgbouncer | Authentification base de donnees |
| `secrets/redis_password` | redis (via compose) | Authentification Redis |
| `secrets/meilisearch_master_key` | meilisearch (via compose) | Authentification Meilisearch |
| `secrets/smtp_password` | api, worker | Envoi d'emails |

Pydantic Settings lit automatiquement depuis `/run/secrets/` via `secrets_dir`.
En dev, les valeurs dans `.env` sont utilisees (pas de Docker Secrets).

### Rotation des secrets

```bash
# 1. Generer un nouveau secret
openssl rand -hex 64 > secrets/secret_key

# 2. Redemarrer les services concernes
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
$COMPOSE up -d --no-deps --force-recreate api worker
```

> **Attention** : la rotation de `SECRET_KEY` invalide tous les JWT en cours.
> Les utilisateurs devront se reconnecter (le refresh token cookie est aussi invalide).

> **Attention** : la rotation de `ENCRYPTION_KEY` rend les donnees chiffrees en DB
> illisibles. Prevoir une migration de re-chiffrement avant rotation.

---

## Securite applicative (deja integree)

| Mesure | Implementation |
|--------|---------------|
| **RBAC** | Permissions role-based, `require_permission()` sur tous les endpoints |
| **JWT HttpOnly** | Refresh token en cookie HttpOnly + Secure + SameSite=Lax |
| **Rate limiting** | slowapi (Redis) + Nginx rate limiting (general + auth) |
| **Brute force** | Lockout par email (5 echecs/15min) + par IP (20 echecs/15min) |
| **Password policy** | Min 8 chars, 1 majuscule, 1 chiffre, 1 special |
| **HSTS** | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| **CSP** | `default-src 'self'; script-src 'self'; frame-ancestors 'none'` |
| **CORS** | Restreint a `FRONTEND_URL` uniquement |
| **Antivirus** | ClamAV scan sur uploads (si active) |
| **RGPD** | Consentement cookies, export/suppression donnees, audit log |
| **MFA** | TOTP + Email OTP |
