# notification.webhook — Changelog

## 2026.02.26

- Ajout permissions `notification.webhook.global.update` et `notification.webhook.global.delete`
- Migration de toutes les routes vers `require_permission()` (user + global webhooks)
- Frontend NotificationSettings : migration `isSuperAdmin` vers `can()` pour sections globales

## 2026.02.19

- `webhooks.user_id` → `ondelete="SET NULL"` (W2)
- Chiffrement Fernet des secrets webhook a la creation/mise a jour, dechiffrement avant envoi (W6/T4)
- Nouvelle table `webhook_delivery_logs` : logging automatique des livraisons (W7)
- Commande `notification.webhook.purge_delivery_logs` (daily, retention configurable)
- CHECK constraints JSONB sur event\_types et notification\_rule\_ids (T7)
- Index GIN sur `webhooks.event_types`
- Config `DELIVERY_LOG_RETENTION_DAYS` (default 90)

## 2026.02.1 — Init

- Webhooks HTTP POST avec retry automatique (configurable)
- Support multi-format : Custom (JSON brut), Slack, Discord
- Webhooks personnels et globaux (admin)
- Signature HMAC optionnelle pour securisation
- Prefixe de message configurable (ex: @canal pour Slack)
- Endpoint de test pour valider la connectivite
- Historique des deliveries avec status HTTP
