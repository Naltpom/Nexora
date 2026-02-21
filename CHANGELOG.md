# Changelog



## 2026.02.15

### Animations modernes + ameliorations UI

- Nouveau systeme d'animations CSS GPU-accelerated (`animations.scss`) : scroll-reveal, page transitions, hover effects, micro-interactions boutons, modals spring, skeleton shimmer
- Hook `useScrollReveal` : IntersectionObserver callback-ref pour reveler les elements au scroll (stagger support)
- Hook `useCountUp` : compteur anime (0 → valeur) avec easing cubic et IntersectionObserver
- Homepage : stat cards avec compteurs animes + stagger reveal + glow au hover, acces rapide avec reveal + lift
- Profil : sections revelees au scroll (`reveal-up`)
- Login : animation d'entree de la card (`login-card-enter`)
- Notification bell : wiggle quand notifications non lues + badge pop
- Page entree : fade-in + translateY sur le `<main>` (`page-enter`)
- Respect `prefers-reduced-motion` (CSS + JS)
- Dark/light theme : glows et shadows adaptes

### \_identity — Parametres admin

- Endpoint `POST /settings/favicon` : upload de favicon (.ico, .png, .svg, max 1 Mo)
- Frontend : bouton upload favicon + preview dans la page Apparence
- Fix color picker etire (specificity `!important`)
- Reorganisation layout section Apparence (logo + couleur en grid, favicon en full-width)

## 2026.02.14

### Infrastructure — Command Registry

- Nouveau systeme de commandes de maintenance par feature (`CommandRegistry`)
- Decouverte automatique des `commands.py` dans `core/` et `features/` (meme pattern que `manifest.py`)
- CLI runner : `python -m src.run_command <name>` et `--list` (pour cron)
- Endpoints admin : `GET /api/commands` + `POST /api/commands/{name}/run`
- Permissions `commands.read` et `commands.manage` ajoutees a `_identity`
- Migration du script `purge_notifications.py` vers `notification/commands.py`
- Suppression de `api/src/purge_notifications.py` (remplace par le Command Registry)

## 2026.02.13

### notification

> [Changelog complet](api/src/core/notification/CHANGELOG.md)

- Bouton "Marquer comme non lu" dans le dropdown bell et la page notifications (user + admin)
- Soft delete des notifications (`deleted_at` au lieu de suppression definitive)
- Filtre admin "Voir les supprimees" avec affichage rouge des lignes supprimees
- Script cron `purge_notifications.py` : suppression definitive des notifications soft-deleted apres N jours (configurable via `NOTIFICATION_PURGE_DAYS` dans `.env`, defaut 90 jours)
- Migration Alembic : ajout colonne `deleted_at` sur la table `notifications`
- Seed : notifications de demo pour tous les utilisateurs (read, unread, soft-deleted)

## 2026.02.12

### preference.didacticiel — Refonte du systeme de tutoriels

> [Changelog complet](api/src/core/preference/CHANGELOG.md)

- Nouveau systeme de tutoriels par feature et par permission (remplace l'ancien systeme par tutorial ID)
- Navigation multi-page : les tutoriels naviguent automatiquement entre les pages avec MutationObserver
- Suivi "vu" par permission : les nouveaux tutoriels se declenchent uniquement pour les permissions non vues
- Toast de notification pour les nouvelles permissions non vues
- Interface admin drag & drop pour reordonner les features et permissions de tutoriels
- Nouveau endpoint `GET/PUT /api/preference/didacticiel/ordering` (stockage dans AppSetting)
- Nouvelle permission `preference.didacticiel.manage`
- Migration automatique des anciennes donnees `tutorials_seen` vers `permissions_seen`
- ~18 sous-tutoriels par permission repartis sur 6 features (\_identity, notification, event, mfa, preference, sso)

## 2026.02.11

### Refactoring : migration CSS → SCSS + extraction des styles inline

- Migration de 6 fichiers CSS vers SCSS (`global`, `notifications`, `sso`, `mfa`, `didacticiel`, `events`)
- Creation de 3 nouveaux fichiers SCSS (`backgrounds.scss`, `_identity.scss`, `preference.scss`)
- Extraction de 360+ styles inline des fichiers TSX vers des classes CSS dans les fichiers SCSS
- Ajout de la dependance `sass` (dev)
- Application du nesting SCSS aux fichiers features (notifications, sso, mfa, events, didacticiel)
- Deplacement des `@keyframes` inline (`<style>` JSX) vers les fichiers SCSS
- Seuls les styles dynamiques (valeurs calculees en JS) restent inline (13 instances)

## 2026.02.10

### Refactoring : renommage des dossiers

- `features/` → `core/` (features template fusionnees dans le dossier framework existant)
- `custom_features/` → `features/` (features projet)
- Feature `_core` → `_identity` (feature systeme d'identite)
- Mise a jour de tous les imports Python et TypeScript
- Mise a jour du Feature Registry (`CORE_FEATURES_DIR`, `PROJECT_FEATURES_DIR`)
- Mise a jour d'Alembic, CLAUDE.md, et de la documentation

## 2026.02.9

### event (NEW)

> [Changelog complet](api/src/core/event/CHANGELOG.md)

- Nouvelle feature `event` : bus d'evenements generique avec persistence
- Declaration des types d'events dans les manifests des features (`FeatureManifest.events`)
- Endpoint `GET /api/events/event-types` pour la decouverte dynamique
- Page admin "Catalogue d'evenements" : liste groupee par feature avec recherche

### \_identity

- Emission d'evenements via event bus : `user.registered`, `user.invited`, `user.invitation_accepted`, `user.updated`, `user.deactivated`, `admin.impersonation_started`
- Lien "Events" dans le menu admin (conditionne par la feature event)

### notification

- Cablage event bus : ecoute `event.persisted` pour le moteur de regles (remplace l'ancien dispatch interne)
- Dependance vers la feature `event` (persistence + catalogue)
- Suppression de l'endpoint doublon `GET /notifications/event-types` (utilise `GET /events/event-types`)
- Emission de `notification.rule_created` a la creation de regles

## 2026.02.8

### notification

- Fix : les regles personnelles n'apparaissent plus dans la section "Regles globales" du super admin

## 2026.02.7

### mfa

- MFA enforcement : banner d'avertissement pendant la periode de grace, redirection forcee apres expiration
- Nouvelle page `MFAForceSetupPage` pour la configuration MFA obligatoire
- Nouveau composant `MFASetupBanner` affiche dans le Layout
- Ajout `mfa_grace_period_expires` dans `TokenResponse`

### preference (NEW)

> [Changelog complet](api/src/core/preference/CHANGELOG.md)

- Feature parent "Preferences" avec sous-features `preference.theme` et `preference.didacticiel`
- Page preferences (`/profile/preferences`) accessible depuis le profil
- `preference.theme` : section theme (dark/light + fond visuel) dans la page preferences
- `preference.didacticiel` : systeme de tutoriels in-app type intro.js (spotlight/tooltip SVG mask)
- Backend : endpoints seen-state (`GET/POST/DELETE /api/preference/didacticiel/seen`)
- Frontend : TutorialContext, TutorialEngine (spotlight overlay), TutorialSection (page preferences)
- Auto-declenchement des tutoriels par route, etat "vu" persiste cote serveur
- Exemple de tutoriel dans la feature notification

## 2026.02.6

### \_identity

- Verification d'email a l'inscription : code 6 chiffres avec expiration 5 min et cooldown 60s
- Nouveaux endpoints API : `POST /auth/verify-email`, `POST /auth/resend-verification`
- Page frontend VerifyEmailPage avec saisie du code, renvoi, et redirection automatique
- Modification du login : redirection vers verification si email non verifie
- Si `EMAIL_ENABLED=False`, la verification est skippee (mode dev)

### notification.email

- Ajout fonction factory `get_email_sender()` (prerequis utilise par \_core)

## 2026.02.5

### \_identity

- Page detail utilisateur par UUID (`/admin/users/:uuid`) avec edition profil, roles, et permissions visuelles (User > Role > Global)
- Ajout UUID sur les utilisateurs (migration Alembic)
- Cascade desactivation des features enfants/dependants
- Fix MFA : feature check avant verification, filtrage methodes par sous-features actives
- Lien MFA Policy dans le menu admin

### sso

- Fix : flow "Lier un compte" SSO (GitHub/Google) redirige correctement vers `/link` au lieu de `/callback`

## 2026.02.4

### \_identity

- Refonte page admin Features : layout en tableau compact au lieu de cartes
- Refonte page admin Roles : panneau lateral split-panel pour la gestion des permissions (pagination, recherche, toggle en temps reel)
- Ajout endpoints API pour permissions paginées et toggle individuel

## 2026.02.3

### sso (NEW)

> [Changelog complet](api/src/core/sso/CHANGELOG.md)

- Feature SSO (Single Sign-On) avec OAuth2 : Google et GitHub
- Liaison automatique de comptes, creation d'utilisateur SSO
- Boutons SSO sur la page de connexion, gestion des comptes lies dans le profil

### mfa (NEW)

> [Changelog complet](api/src/core/mfa/CHANGELOG.md)

- Feature MFA (Authentification Multi-Facteurs) : TOTP et Email OTP
- Codes de secours (backup codes)
- Policy MFA par role avec periode de grace
- Configuration MFA dans le profil, page admin de gestion des policies

### \_identity

- Modification du flow de login pour supporter le MFA (token MFA temporaire en 2 etapes)
- Extension de `TokenResponse` avec champs MFA
- Ajout `create_mfa_token()` / `decode_mfa_token()` dans security.py
- Support des routes features publiques (flag `public`) dans ProtectedRoute

## 2026.02.2

### \_identity

- Fix : CORS origins corriges (5472 au lieu de 3020/5462)
- Fix : bcrypt + passlib compatibilite (monkey-patch `bcrypt.__about__`)

### notification

- Fix : SSE stream ne garde plus de connexion DB ouverte (evite QueuePool exhaustion)

### Infrastructure

- Fix : `docker-compose.yml` suppression attribut `version` obsolete
- Fix : `package.json` version CalVer corrigee (`2026.02.1` au lieu de `2026.2.1`)
- Ajout regle CLAUDE.md : toujours utiliser Docker pour les commandes

## 2026.02.1 — Init

### \_identity

→ [Changelog complet](api/src/core/_identity/CHANGELOG.md)

- Auth JWT + SSO, utilisateurs, roles, permissions granulaires, feature registry, impersonation, app settings, backups, invitations, recherche globale

### notification

→ [Changelog complet](api/src/core/notification/CHANGELOG.md)

- Notifications in-app avec SSE, moteur de regles event-driven, templates globaux, preferences utilisateur

### notification.email

→ [Changelog complet](api/src/core/notification/email/CHANGELOG.md)

- Envoi SMTP configurable (Office365 par defaut)

### notification.push

→ [Changelog complet](api/src/core/notification/push/CHANGELOG.md)

- Web Push VAPID avec service worker

### notification.webhook

→ [Changelog complet](api/src/core/notification/webhook/CHANGELOG.md)

- Webhooks HTTP avec retry, support Slack/Discord/Custom, signature HMAC

### Infrastructure

- Docker 3 services (db:5470, api:5471, app:5472)
- PostgreSQL + SQLAlchemy async (asyncpg)
- Alembic pour les migrations
- Config YAML dual : `config.template.yaml` (template) + `config.custom.yaml` (projet)
- Frontend React 18 + TypeScript + Vite + Bun
- Dark theme et light theme
- CalVer `YYYY.MM.N` pour le versioning
