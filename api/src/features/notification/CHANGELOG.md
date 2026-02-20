# notification — Changelog

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
