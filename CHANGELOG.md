# Changelog

## 2026.02.25

### preference.font — Personnalisation typographique

- Nouvelle sous-feature `preference.font` : choix de police (System, Inter, Roboto, Open Sans, Atkinson Hyperlegible, OpenDyslexic), echelle de texte (85-125%), interligne (1.2-2.0), epaisseur (300-700)
- L'echelle de texte applique un % sur `<html>` : tous les textes (titres, boutons, labels, etc.) scalent proportionnellement
- Conversion de toutes les `font-size` du codebase de `px` vers `rem` (180+ declarations dans 15 fichiers SCSS)
- Google Fonts charges dans `index.html` (Inter, Roboto, Open Sans, Atkinson Hyperlegible)

### preference.layout — Mise en page

- Nouvelle sous-feature `preference.layout` : densite d'affichage (compact/normal/airy), border-radius (0-16px), largeur du contenu (narrow/normal/wide/full), espacement des sections (8-32px)
- Preview visuel du border-radius en temps reel
- Variables CSS de densite appliquees aux composants globaux : `.btn`, `.form-group input`, `.unified-table`, `.unified-card-header`, `.card-padded`, `.page-narrow`
- Variables : `--density-padding`, `--density-gap`, `--density-row-height`, `--density-btn-padding`, `--density-input-padding`, `--density-card-padding`, `--content-max-width`, `--section-gap`

### preference.composants — Style des composants

- Nouvelle sous-feature `preference.composants` : style des cards (flat/elevated/bordered), style des boutons (rounded/square/pill), animation des modals (none/fade/slide/scale), bandes alternees dans les tables, separateurs de listes
- Preview en temps reel avec une card et un bouton exemples
- CSS global via `data-card-style`, `data-btn-style`, `data-modal-anim` et classes utilitaires

### preference.accessibilite — Accessibilite

- Nouvelle sous-feature `preference.accessibilite` : contraste eleve, reduction des animations, police dyslexie (OpenDyslexic), focus renforce, soulignement des liens, cibles agrandies (44px min)
- Badge compteur d'options actives dans le titre de la section
- Classes CSS globales `a11y-*` appliquees sur `<html>`

### Infra preference

- Pre-render des 4 nouvelles preferences dans `main.tsx` IIFE (anti-flash)
- Application des preferences au login dans `AuthContext.tsx`
- `global.scss` : body utilise les CSS variables `--font-family`, `--line-height`, `--font-weight`, font-size en `1rem`
- `.main-content` utilise `--content-max-width` et `--density-padding`
- 4 feature flags ajoutes dans `config.template.yaml`
- `DraftPreferenceContext` : brouillon des preferences avant sauvegarde, modale de changements non sauvegardes
- PreferencePage refactorisee avec onglets (tabs) par sous-feature
- CLAUDE.md enrichi : regles SCSS (rem, var(--radius), variables de densite), regle versioning (1 version = 1 commit/merge)
- ROADMAP.md : Phase 2.2 marquee terminee, details techniques mis a jour

## 2026.02.24

### preference.didacticiel — Page Aide + corrections tutoriels

- Nouvelle page `/aide` : tutoriels interactifs deplaces depuis les Preferences vers une page dediee
- Cards de statistiques : nombre d'etapes de tuto, permissions avec/sans tutoriel
- Affichage du nombre d'etapes et du code permission pour chaque tutoriel dans la liste
- Descriptions ajoutees aux 8 tutoriels `_identity` (recherche, users, roles, features, settings, impersonation)
- Icone `help-circle` ajoutee au registre d'icones de navigation
- Correction : la croix (X) ferme le tutoriel sans marquer comme vu (re-affichage au F5)
- Correction : "Tout passer" ne passe que la section courante (pas toutes les features)
- Correction : persistance des tutoriels vus en DB (`flag_modified` pour JSONB)
- Correction : le clic sur l'overlay ferme le tutoriel proprement

### rgpd.politique — Ameliorations AcceptLegalPage

- Deux modes d'affichage : pas-a-pas pour comptes existants, compact pour nouvelles inscriptions
- Scroll-to-bottom obligatoire avant de pouvoir cocher "J'ai lu et j'accepte"
- Detection compte existant via anciennete du compte (> 5 min) ou acceptations precedentes
- Reset du scroll entre les documents en mode pas-a-pas
- Blocage du tutoriel et de la notification sur `/accept-legal` et `/change-password`

## 2026.02.23

### rgpd.politique — Acceptation obligatoire des documents legaux

- Nouveau champ `requires_acceptance` sur les pages legales : l'admin peut marquer un document comme obligatoire
- Nouvelle table `legal_page_acceptances` : tracking des acceptations par utilisateur/version
- Nouvelle table `legal_page_versions` : historique des contenus precedents
- Page bloquante `/accept-legal` : l'utilisateur doit accepter tous les documents obligatoires avant d'acceder au site
- Quand un document obligatoire est mis a jour, toutes les acceptations sont invalidees
- Refuser → deconnexion forcee avec message explicatif sur la page login
- Option "Supprimer mon compte" avec modal de confirmation → soft delete 30 jours avec reactivation possible
- Reactivation automatique du compte si l'utilisateur se reconnecte dans les 30 jours
- Polling mid-session (2 min) pour detecter les mises a jour de documents en cours de session
- Admin : toggle "Acceptation obligatoire", historique des versions, warning de modification
- CGU et Politique de confidentialite marques obligatoires par defaut (seed migration)
- Endpoint `DELETE /auth/me/account` : suppression self-service du compte

## 2026.02.22

### Navigation — Menu dynamique user + admin

- Nouveau module `navigation` : menu dropdown dynamique depuis les manifests de features
- Les utilisateurs non-admin obtiennent un menu dropdown avec avatar (au lieu d'un simple lien profil + bouton logout)
- Les items du menu sont declares dans les `navItems` des manifests frontend et filtres par permissions/features actives
- Section admin organisee en sous-groupes thematiques : Gestion (users, roles, permissions), Systeme (features, parametres, BDD, commandes, notifications), Securite & Conformite (events, MFA, RGPD)
- Les sous-groupes vides ne s'affichent pas
- Registre d'icones SVG centralise (`icons.tsx`) — suppression des SVG inline du Header
- Hook `useNavigationItems` : collecte, filtre et trie les items via `import.meta.glob` (meme pattern que App.tsx et TutorialContext)
- Header.tsx reduit de ~355 lignes a ~80 lignes
- Ajout de `navItems` dans les manifests : `_identity`, `preference`, `mfa`, `notification`, `rgpd`, `event`
- Support dark + light theme complet

## 2026.02.21

### rgpd.consentement
- Enforcement du consentement RGPD : les preferences (theme, langue) ne sont plus stockees en localStorage si le consentement fonctionnel n'est pas accorde
- Nettoyage automatique du storage local lors de la revocation du consentement fonctionnel (banniere + page consentement)
- Guard dans main.tsx pour ne pas lire le cache preferences sans consentement (flash theme acceptable)
- Guard dans AuthContext pour empecher lecture/ecriture localStorage sans consentement
- Nouveau module `consentManager.ts` : utilitaire pur TS pour verifier/appliquer le consentement
- Wording CNIL : "cookies" remplace par "cookies et traceurs" dans banniere, page consentement, pages legales, tutoriels

## 2026.02.20

### Nouvelle feature : RGPD & Conformite

Feature parent `rgpd` avec 6 sous-features pour la conformite RGPD.

#### rgpd.consentement
- Banniere de consentement cookies (anonymous + authenticated)
- Enregistrement et historique des choix de consentement par categorie
- 4 categories : strictement necessaires, fonctionnels, analytiques, marketing
- Endpoint public POST pour visiteurs anonymes

#### rgpd.registre
- Registre des traitements de donnees personnelles (Article 30 RGPD)
- CRUD admin : nom, finalite, base legale, categories de donnees, duree de conservation
- 6 bases legales supportees (consentement, contrat, obligation legale, etc.)

#### rgpd.droits
- Exercice des droits RGPD : acces, rectification, effacement, portabilite, opposition, limitation
- Formulaire utilisateur pour soumettre une demande
- Interface admin pour traiter les demandes (statuts: en attente, en cours, traitee, refusee)

#### rgpd.export
- Export des donnees personnelles en JSON et CSV (Article 20 — portabilite)
- Apercu des donnees collectees avant export
- Collecte de toutes les donnees : profil, roles, permissions, sessions, notifications, evenements, consentements

#### rgpd.politique
- Pages legales editables par l'admin : politique de confidentialite, CGU, mentions legales, politique cookies
- Endpoints publics (pas d'authentification requise)
- Versioning automatique des pages

#### rgpd.audit
- Journal d'audit des acces aux donnees personnelles
- Filtrage par action, type de ressource, utilisateur cible
- Vue admin paginee

#### Infrastructure
- 5 tables : `consent_records`, `data_processing_register`, `rights_requests`, `data_access_logs`, `legal_pages`
- 2 commandes de maintenance : purge audit logs > 365j, purge consentements > 3 ans
- 12 permissions RGPD
- Banniere cookies en headerComponent (frontend)
- Page admin RGPD avec 4 onglets (registre, droits, audit, pages legales)
- Support dark + light theme complet

## 2026.02.19

### Corrections SWOT — Securite, integrite et robustesse du schema DB

Correction de 8 faiblesses (W) et 6 menaces (T) identifiees dans l'analyse SWOT, en 5 phases.

#### Phase 1 — FK, ondelete, indexes
- **event** : ajout indexes sur `events.actor_id` et `events.resource_id` (W1)
- **notification** : `notifications.user_id` → `ondelete="CASCADE"`, `notification_rules.created_by_id` → nullable + `ondelete="SET NULL"` (W2)
- **notification.webhook** : `webhooks.user_id` → `ondelete="SET NULL"` (W2)
- **\_identity** : FK sur `impersonation_actions.session_id` → `impersonation_logs.session_id` avec CASCADE (W3)

#### Phase 2 — User.preferences Text → JSONB
- **\_identity** : colonne `preferences` convertie de `Text` a `JSONB` (W4)
- Suppression de tous les `json.loads`/`json.dumps` dans routes\_auth, services, preference/didacticiel

#### Phase 3 — Chiffrement at-rest + HMAC tokens
- Nouveau module `api/src/core/encryption.py` : `encrypt_value`, `decrypt_value`, `is_encrypted` (Fernet) (W6/T4)
- Setting `ENCRYPTION_KEY` dans config
- **mfa.totp** : chiffrement du secret TOTP avant stockage, dechiffrement avant verification
- **notification.webhook** : chiffrement des secrets webhook a la creation/mise a jour, dechiffrement avant envoi
- **\_identity** : `SecurityToken.hash_value` migre de SHA-256 vers HMAC-SHA256 (T3)

#### Phase 4 — Sessions, delivery logs, soft delete
- **\_identity** : nouvelle table `user_sessions` pour le suivi des refresh tokens (W5)
  - Login cree une session, refresh revoque l'ancienne et en cree une nouvelle
  - Detection de reutilisation de token (revocation de toutes les sessions)
  - Endpoints `GET /me/sessions`, `DELETE /me/sessions/{id}`, `DELETE /me/sessions`
- **notification.webhook** : nouvelle table `webhook_delivery_logs` (W7)
  - Logging automatique des livraisons webhook avec status, duree, erreur
  - Commande de purge `notification.webhook.purge_delivery_logs`
- **\_identity** : soft delete User via `deleted_at` (T6)
  - `DELETE /users/{id}` fait un soft delete (anonymise email, desactive)
  - `authenticate_user` filtre les users soft-deleted
  - `get_current_user` et `get_current_user_from_query_token` rejettent les soft-deleted
  - Commande RGPD `_identity.purge_soft_deleted_users` (hard-delete apres 30 jours)
  - Commande `_identity.purge_expired_sessions`

#### Phase 5 — RBAC super\_admin + validation JSONB
- Role `super_admin` cree automatiquement avec toutes les permissions (T2)
- `get_current_super_admin` verifie via RBAC (avec fallback legacy `is_super_admin` flag)
- CHECK constraints JSONB sur `notification_rules`, `webhooks`, `mfa_role_policies`, `user_rule_preferences` (T7)
- Index GIN sur `notification_rules.event_types` et `webhooks.event_types`
- Nettoyage des valeurs JSONB null → SQL NULL

#### Migration Alembic
- Migration unique `e5f6a7b8c9d0` couvrant les 5 phases

## 2026.02.18

### \_identity — Page admin Commandes de maintenance + historique

- Nouvelle table `command_states` : persistance de l'etat enable/disable des commandes de maintenance
- Endpoint `PATCH /api/commands/{name}` : active/desactive une commande avec persistance en DB
- `CommandRegistry.load_states_from_db_sync()` : chargement des etats depuis la DB au startup
- `CommandRegistry.set_command_enabled()` : mise a jour de l'etat en memoire
- Page admin `/admin/commands` : liste des commandes avec toggle enable/disable et bouton executer
- Lien "Commandes" dans le menu admin du Header (icone terminal)
- Migration Alembic : creation table `command_states`
- Nouvelle table `command_executions` : historique d'execution avec resultat JSON, duree, source, utilisateur
- Logging automatique dans `CommandRegistry.run_command()` (API + CLI)
- Endpoint `GET /api/commands/history` : historique pagine avec filtres (commande, statut)
- Page admin `/admin/commands/history` : tableau historique avec modal detail, pagination, filtres
- Bouton "Historique" dans la page Commandes
- Commande `_identity.purge_command_logs` : purge mensuelle des logs > 90 jours
- Config `COMMAND_LOG_RETENTION_DAYS` (default 90)
- Styles badge-success, badge-warning, badge-error, badge-info ajoutes au theme global

## 2026.02.17

### \_identity — Table SecurityToken + commandes maintenance

- Nouvelle table `security_tokens` : stockage dedie des codes de verification email, tokens de reset password et codes d'invitation
- Hash SHA256 pour lookup O(1) au lieu de scanner tous les users (bcrypt)
- Invalidation automatique des anciens tokens non utilises a chaque creation
- Suppression des colonnes obsoletes de `users` (`verification_code_hash`, `password_reset_token`, etc.)
- Suppression des colonnes obsoletes de `invitations` (`verification_code_hash`, `code_expires_at`, etc.)
- Migration Alembic : creation table + drop colonnes + FK cascade notifications→events
- 3 nouvelles commandes maintenance :
  - `_identity.purge_expired_tokens` (daily minuit) — purge tokens expires/consommes
  - `_identity.purge_impersonation_logs` (mensuel) — purge logs > 6 mois
  - `_identity.backup_database` (daily 6h) — pg_dump avec auto-cleanup 7 jours

### event — Commande purge

- Nouvelle commande `event.purge_old_events` (daily 4h) — supprime events > 180 jours (cascade notifications)
- FK `notifications.event_id` modifiee avec `ondelete CASCADE`
- Config `EVENT_RETENTION_DAYS` ajoutee

### notification — FK cascade

- FK `notifications.event_id` mise a jour avec `ondelete='CASCADE'` pour permettre la purge des events

### notification.push — Commande cleanup

- Nouvelle commande `notification.push.cleanup_stale` (hebdo dimanche 5h) — purge subscriptions inactives > 90 jours
- Config `PUSH_SUBSCRIPTION_RETENTION_DAYS` ajoutee

## 2026.02.16

### preference.couleur — Personnalisation des couleurs

- Nouvelle sous-feature `preference.couleur` sous `preference`
- Personnalisation de toutes les couleurs de l'application (primary, status, gray scale)
- Variantes separees pour les themes clair et sombre
- Application pre-render pour eviter le flash de couleurs
- Composant ColorSection avec pickers et reinitialisation

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
