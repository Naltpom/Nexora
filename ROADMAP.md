# Roadmap

## Points d'attention

### Architecture

| Point | Severite | Detail |
|-------|----------|--------|
<!-- | Pas de tests | Haute | Aucun framework de test configure (ni backend ni frontend). 75 permissions, 26 tables, 45 endpoints sans couverture | -->
| ~~Rate limiting partiel~~ | ~~Faible~~ | Corrige : slowapi sur login (5/min), register (3/min), forgot/reset-password (3-5/min), verify-email (5/min), MFA verify (5/min). Limites configurables via `.env` |
| ~~Pas de cache applicatif~~ | ~~Moyenne~~ | Corrige : TTLCache in-process sur `load_user_permissions()` (TTL 5min, max 1000 users). Invalidation automatique a chaque changement de role/permission |
| ~~CORS restrictif~~ | ~~Faible~~ | Corrige : CORS dynamique via `FRONTEND_URL` ou `CORS_ORIGINS` (multi-origines comma-separated). Methods et headers restreints |
| ~~Monolithe~~ | ~~Info~~ | Corrige : Redis (pub/sub, rate limiting, task queue), SSE broadcaster Redis, ARQ worker pour email/webhook/push async. Rate limiter slowapi sur Redis. Compatible multi-instance |

### Base de donnees

| Point | Severite | Detail |
|-------|----------|--------|
| Pas de partitioning | Faible | Les tables `events`, `notifications`, `webhook_delivery_logs` ont un purge automatique (cron daily, retention configurable via `.env`) mais pas de partitioning natif PostgreSQL. A envisager si volume > 1M lignes/an |
| Pool sizing | Faible | `pool_size` et `max_overflow` configurables via `.env` (`POOL_SIZE=10`, `POOL_MAX_OVERFLOW=20`) — valeurs dev par defaut, a tuner en prod |

### Frontend

| Point | Severite | Detail |
|-------|----------|--------|
<!-- | Pas de lazy loading des i18n | Faible | Tous les JSON de traductions charges en eager (`import.meta.glob` eager). ~1200+ cles FR chargees au boot | -->
<!-- | HMR desactive | Faible | `hmr: false` dans `vite.config.ts` — le hot-reload fonctionne via polling mais pas via websocket HMR | -->
<!-- | Pas de error boundary | Moyenne | Pas de React Error Boundary global — une erreur dans un composant crashe toute l'app | -->
<!-- | noUnusedLocals: false | Faible | TypeScript n'alerte pas sur les imports/variables inutilisees | -->

### Securite

| Point | Severite | Detail |
|-------|----------|--------|
| JWT HS256 | Moyenne | Algorithme symetrique — si la cle fuite, n'importe qui peut forger des tokens. RS256 serait plus securise pour multi-service |
| ~~Access token 24h~~ | ~~Moyenne~~ | Corrige : access token 15 min + refresh transparent (rotation, detection reutilisation, sessions trackees) |
| Secrets OAuth en .env | Info | Les `client_secret` GitHub/Google sont en clair dans `.env` (acceptable en dev, a securiser en prod via vault) |
| ~~Pas de CSP headers~~ | ~~Moyenne~~ | Corrige : SecurityHeadersMiddleware (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) |
| ~~Pas de protection brute force~~ | ~~Haute~~ | Corrige : rate limiter in-memory (5 echecs/15 min par email, 20/15 min par IP → lockout 15 min) |

---

## Conclusion

L'application est architecturalement solide et bien structuree pour un template SaaS. Le Feature Registry est le coeur de l'architecture et il est mature (toggle, cascade, gating, permissions auto-sync). La stack est moderne et les choix techniques sont coherents.

La principale lacune restante est l'absence de tests. Le rate limiting, le cache permissions, le CORS dynamique, les security headers, Redis, le worker async ARQ et le SSE broadcaster Redis sont desormais en place.

**Maturite globale : 9/10** — Solide pour un template, hardening production quasi-complet. Reste : tests, JWT RS256.
