# Changelog

## 2026.02.1 — Init

### _core
→ [Changelog complet](api/src/features/_core/CHANGELOG.md)
- Auth JWT + SSO, utilisateurs, roles, permissions granulaires, feature registry, impersonation, app settings, backups, invitations, recherche globale

### notification
→ [Changelog complet](api/src/features/notification/CHANGELOG.md)
- Notifications in-app avec SSE, moteur de regles event-driven, templates globaux, preferences utilisateur

### notification.email
→ [Changelog complet](api/src/features/notification/email/CHANGELOG.md)
- Envoi SMTP configurable (Office365 par defaut)

### notification.push
→ [Changelog complet](api/src/features/notification/push/CHANGELOG.md)
- Web Push VAPID avec service worker

### notification.webhook
→ [Changelog complet](api/src/features/notification/webhook/CHANGELOG.md)
- Webhooks HTTP avec retry, support Slack/Discord/Custom, signature HMAC

### Infrastructure
- Docker 3 services (db:5470, api:5471, app:5472)
- PostgreSQL + SQLAlchemy async (asyncpg)
- Alembic pour les migrations
- Config YAML dual : `config.template.yaml` (template) + `config.custom.yaml` (projet)
- Frontend React 18 + TypeScript + Vite + Bun
- Dark theme et light theme
- CalVer `YYYY.MM.N` pour le versioning
