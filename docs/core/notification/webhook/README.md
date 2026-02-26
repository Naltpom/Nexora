# notification.webhook

Sous-feature de `notification`. Gere les webhooks HTTP pour la livraison de notifications vers des services externes.

## Architecture

| Couche | Fichier | Role |
|--------|---------|------|
| Manifest | `api/src/core/notification/webhook/manifest.py` | 9 permissions, 4 events, parent=notification |
| Models | `api/src/core/notification/webhook/models.py` | `Webhook`, `WebhookDeliveryLog` |
| Schemas | `api/src/core/notification/webhook/schemas.py` | `WebhookCreate`, `WebhookUpdate`, `WebhookResponse` |
| Routes | `api/src/core/notification/webhook/routes.py` | 10 endpoints (5 user + 5 global) |
| Services | `api/src/core/notification/webhook/services.py` | `HttpWebhookSender` — envoi HTTP + HMAC |
| Commands | `api/src/core/notification/webhook/commands.py` | Purge delivery_logs (cron 3h UTC) |
| Frontend | `app/src/core/notification/NotificationSettings.tsx` | CRUD webhooks integre dans les settings |
| SCSS | `app/src/core/notification/notifications.scss` L730-805 | Section `.notif-webhook-*` |
| i18n | `app/src/core/notification/i18n/fr.json` + `en.json` | Cles `webhooks_*` (L136-173) |

## Deux niveaux de webhooks

| Type | Scope | Qui peut gerer | Permissions |
|------|-------|----------------|-------------|
| **Personnel** | Un seul user | L'owner | `notification.webhook.{read,create,update,delete,test}` (GlobalPerm) |
| **Global** | Systeme entier | Admins | `notification.webhook.global.{read,create,update,delete}` |

## Endpoints API

### Webhooks personnels (`/api/notifications/webhooks`)

| Methode | Path | Permission | Description |
|---------|------|------------|-------------|
| GET | `/` | `notification.webhook.read` | Liste mes webhooks |
| POST | `/` | `notification.webhook.create` | Creer un webhook |
| PUT | `/{id}` | `notification.webhook.update` | Modifier (owner ou admin global.update) |
| DELETE | `/{id}` | `notification.webhook.delete` | Supprimer (owner ou admin global.delete) |
| POST | `/{id}/test` | `notification.webhook.test` | Envoyer un test (owner ou admin global.read) |

### Webhooks globaux (`/api/notifications/webhooks/global`)

| Methode | Path | Permission | Description |
|---------|------|------------|-------------|
| GET | `/global` | `notification.webhook.global.read` | Liste les webhooks globaux |
| POST | `/global` | `notification.webhook.global.create` | Creer un webhook global |
| PUT | `/global/{id}` | `notification.webhook.global.update` | Modifier (filtre `is_global=True`) |
| DELETE | `/global/{id}` | `notification.webhook.global.delete` | Supprimer (filtre `is_global=True`) |

## Formats supportes

| Format | Payload | Usage |
|--------|---------|-------|
| `custom` | JSON brut (event_type, actor, message, payload) | Integrations generiques |
| `slack` | Blocks API + text fallback | Slack Incoming Webhooks |
| `discord` | Embeds + content | Discord Webhooks |

Le format est valide par `Literal["custom", "slack", "discord"]` dans les schemas Pydantic.

## Securite

- **Secret HMAC** : si un secret est configure, le body est signe en HMAC-SHA256 et le header `X-Webhook-Signature: sha256={hex}` est ajoute
- **Encryption at rest** : le secret est chiffre en DB via `encrypt_value()` et dechiffre a l'envoi
- **Secret non expose** : `WebhookResponse` n'inclut pas le champ `secret`
- **Isolation globale** : les routes `/global/*` filtrent `Webhook.is_global.is_(True)` pour empecher la manipulation de webhooks personnels

## Events emis

| Event | Declencheur |
|-------|-------------|
| `notification.webhook.created` | Creation d'un webhook (personnel ou global) |
| `notification.webhook.updated` | Modification d'un webhook |
| `notification.webhook.deleted` | Suppression d'un webhook |
| `notification.webhook.tested` | Test manuel d'un webhook |

Payload : `actor_name`, `webhook_name`, `webhook_url`, `is_global`, `success` (test), `fields_updated` (update).

## Integration parent (process_notifications)

Dans `notification/services.py`, quand un event est emis :

1. Les rules actives sont matchees
2. Si `channel_webhook=True` pour une rule/user :
   - Webhooks explicites (`webhook_ids`) → envoyes directement
   - Webhooks par rule (`notification_rule_ids` match) → envoyes
   - Webhooks par event_type (wildcard `event.*` supporte) → envoyes
3. Le payload est formate selon `webhook.format` via `build_webhook_payload()`
4. Chaque livraison est loggee dans `WebhookDeliveryLog`

## Delivery Logs

- Table `webhook_delivery_logs` : status_code, success, error_message, duration_ms
- Purge automatique : cron `0 3 * * *` via `DELIVERY_LOG_RETENTION_DAYS`
- Index composite `(webhook_id, created_at)` pour les requetes de monitoring

## Prefix

Champ optionnel `prefix` sur le webhook. Ajoute au payload selon le format :
- **Slack** : `{prefix}\n{text}` dans le bloc markdown
- **Discord** : `content: prefix` au-dessus de l'embed
- **Custom** : champ `prefix` dans le JSON

## Revue v2026.02

### Bugs corriges

| # | Severite | Bug | Fix |
|---|----------|-----|-----|
| 1 | HIGH | `delete_webhook` verifiait `global.update` au lieu de `global.delete` | Permission corrigee (routes.py:165) |
| 2 | HIGH | `test_webhook` verifiait `global.update` au lieu de `global.read` | Permission corrigee (routes.py:201) |
| 3 | HIGH | Routes globales PUT/DELETE sans filtre `is_global=True` | Filtre ajoute dans les queries (routes.py:334,375) |
| 4 | MEDIUM | Webhooks rule-matched sans `webhook_id`/`event_id` dans l'enqueue | Args ajoutes (services.py parent) |
| 5 | MEDIUM | 14 `border-radius` hardcodes dans le SCSS notification | Remplaces par `var(--radius)` + density vars |
| 6 | LOW | `format` acceptait n'importe quel string | `Literal["custom", "slack", "discord"]` (schemas.py) |
| 7 | — | Aucun event emis dans les routes webhook | 4 events declares + emis dans les 7 routes CRUD |
