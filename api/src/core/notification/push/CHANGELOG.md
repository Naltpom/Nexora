# notification.push — Changelog

## 2026.02.26

- Ajout `require_permission()` sur routes subscribe (`notification.push.subscribe`) et status (`notification.push.read`)

## 2026.02.17

- Nouvelle commande `notification.push.cleanup_stale` : purge subscriptions inactives > PUSH_SUBSCRIPTION_RETENTION_DAYS jours
- Config `PUSH_SUBSCRIPTION_RETENTION_DAYS` (default 90)

## 2026.02.1 — Init

- Web Push notifications via protocole VAPID (ECDSA P-256)
- Service Worker (`sw.js`) pour reception en arriere-plan
- Gestion des abonnements push par navigateur (subscribe/unsubscribe)
- Endpoint public pour la cle VAPID
- Configurable via .env (VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, PUSH_ENABLED)
