# Roadmap

## Points d'attention

### Architecture

| Point | Severite | Detail |
|-------|----------|--------|
| Pas de tests | Haute | Aucun framework de test configure (ni backend ni frontend). 75 permissions, 26 tables, 45 endpoints sans couverture |
| Pas de rate limiting | Moyenne | Aucun throttle sur login, register, reset-password, MFA verify — vulnerable au brute force |
| Pas de cache applicatif | Moyenne | Pas de Redis/Memcached. Les permissions sont rechargees a chaque requete (`load_user_permissions` = 3 queries SQL) |
| CORS restrictif | Faible | Hardcode `http://localhost:5472` — a parametrer via env pour prod |
| Monolithe | Info | Tout dans un seul process FastAPI. Les SSE notifications + webhook deliveries pourraient beneficier d'un worker async (Celery/ARQ) a terme |

### Base de donnees

| Point | Severite | Detail |
|-------|----------|--------|
| Pas de partitioning | Faible | Les tables `events`, `notifications`, `webhook_delivery_logs` vont grossir. A surveiller |
| Pool sizing | Faible | `pool_size=10, max_overflow=20` — suffisant en dev, a tuner en prod |
| Alembic URL hardcodee | Faible | `alembic.ini` contient l'URL de la DB en dur (dev). `env.py` devrait overrider depuis `Settings` |

### Frontend

| Point | Severite | Detail |
|-------|----------|--------|
| Pas de lazy loading des i18n | Faible | Tous les JSON de traductions charges en eager (`import.meta.glob` eager). ~1200+ cles FR chargees au boot |
| HMR desactive | Faible | `hmr: false` dans `vite.config.ts` — le hot-reload fonctionne via polling mais pas via websocket HMR |
| Pas de error boundary | Moyenne | Pas de React Error Boundary global — une erreur dans un composant crashe toute l'app |
| noUnusedLocals: false | Faible | TypeScript n'alerte pas sur les imports/variables inutilisees |

### Securite

| Point | Severite | Detail |
|-------|----------|--------|
| JWT HS256 | Moyenne | Algorithme symetrique — si la cle fuite, n'importe qui peut forger des tokens. RS256 serait plus securise pour multi-service |
| Access token 24h | Moyenne | Duree longue. 15-30 min serait plus securise avec refresh transparent |
| Secrets OAuth en .env | Info | Les `client_secret` GitHub/Google sont en clair dans `.env` (acceptable en dev, a securiser en prod via vault) |
| Pas de CSP headers | Moyenne | Aucun Content-Security-Policy configure |

---

## Conclusion

L'application est architecturalement solide et bien structuree pour un template SaaS. Le Feature Registry est le coeur de l'architecture et il est mature (toggle, cascade, gating, permissions auto-sync). La stack est moderne et les choix techniques sont coherents.

Les principales lacunes sont l'absence de tests et de rate limiting — deux elements critiques avant toute mise en production. Le reste (cache, workers, monitoring) releve de l'optimisation a l'echelle.

**Maturite globale : 7.5/10** — Solide pour un template, manque le hardening production (tests, rate limit, CSP, monitoring).
