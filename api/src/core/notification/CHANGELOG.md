# notification — Changelog

## 2026.02.26

- Migration des routes vers `require_permission()` : `notification.read`, `notification.delete`, `notification.admin`, `notification.rules.*`
- Ajout didacticiels frontend : `notification.push.subscribe`, `notification.webhook.create`, `notification.webhook.read`, `notification.rules.update`, `notification.rules.delete`

## 2026.02.19

- `notifications.user_id` → `ondelete="CASCADE"` (W2)
- `notification_rules.created_by_id` → nullable + `ondelete="SET NULL"` (W2)
- CHECK constraints JSONB sur `notification_rules` (event\_types, target\_user\_ids, webhook\_ids) (T7)
- Index GIN sur `notification_rules.event_types`
- Nettoyage JSONB null → SQL NULL

## 2026.02.17

- FK `notifications.event_id` mise a jour avec `ondelete='CASCADE'` (permet purge events)

## 2026.02.15

- Animation wiggle sur la cloche quand `unreadCount > 0` (classe `notification-bell-wiggle`)
- Animation `badge-pop` sur le badge de notification

## 2026.02.14

- Migration `purge_notifications.py` vers `commands.py` (Command Registry)
- Declaration `CommandDefinition` avec schedule cron et config keys

## 2026.02.13

- Nouveau endpoint `PATCH /notifications/{id}/unread` pour remettre une notification en non lu
- Nouveau service `mark_notification_unread()` (inverse de `mark_notification_read`)
- Soft delete : `delete_notification()` set `deleted_at` au lieu de supprimer en base
- Filtre `deleted_at IS NULL` ajoute a toutes les requetes utilisateur (list, count, mark_all_read, delete, SSE)
- Parametre `include_deleted` sur l'endpoint admin pour afficher les notifications supprimees
- Champ `deleted_at` ajoute au schema `AdminNotificationResponse`
- Migration Alembic : ajout colonne `deleted_at` (DateTime timezone-aware, nullable)
- Frontend : bouton "Marquer comme non lu" dans le dropdown bell (pour les notifs lues)
- Frontend : toggle read/unread dans la page notifications (vue user et admin)
- Frontend : checkbox "Voir les supprimees" dans la vue admin avec lignes rouges
- `markAsUnread()` ajoute au `NotificationContext`
- Script cron `purge_notifications.py` : hard-delete des notifications soft-deleted > N jours
- Config `NOTIFICATION_PURGE_DAYS` ajoutee dans Settings, `.env`, `.env.example`
- Seed : notifications de demo (read, unread, soft-deleted) pour Nathan, Alice, Bob, Charlie

## 2026.02.9

- Cablage event bus : ecoute `event.persisted` via `event_handlers.py` pour le moteur de regles
- Dependance vers la feature `event` (`depends=["event"]` dans le manifest)
- Suppression du model `Event` local (deplace vers `features/event/models.py`)
- Suppression de `dispatch_event`, `EVENT_CATALOG`, `get_event_categories`, `is_admin_only_event` du services.py
- Suppression de l'endpoint doublon `GET /notifications/event-types` (utilise `GET /events/event-types`)
- Emission de `notification.rule_created` a la creation de regles (admin et personnelles)

## 2026.02.8

- Fix : les regles personnelles (`target_type=self`) n'apparaissent plus dans la liste des regles globales super admin

## 2026.02.2

- Fix : SSE `/stream` utilise `decode_query_token_lightweight` au lieu de `get_current_user_from_query_token` — ne garde plus de connexion DB ouverte pendant toute la duree du stream (evite QueuePool exhaustion)

## 2026.02.1 — Init

- Notifications in-app avec stockage en base et pagination
- SSE (Server-Sent Events) pour reception en temps reel
- Moteur de regles event-driven : regles personnelles et globales (admin)
- Templates de regles : appliques automatiquement a tous les utilisateurs
- Preferences utilisateur par regle (activation, canaux, webhooks)
- Compteur de non-lus avec endpoint dedie
- Marquage lu/non-lu individuel et global
- NotificationBell dynamique : dropdown push si actif, lien settings sinon
- Prompt d'activation push conditionne par le feature flag `notification.push`
