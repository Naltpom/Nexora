# Changelog

## 2026.02.48

### preference.accessibilite (revue complete — 3 fixes)

- **SCSS border-radius hardcode (LOW)** : `border-radius: 10px` remplace par `var(--radius)` sur `.a11y-section__active-count`
- **SCSS density vars manquantes (LOW)** : `padding: 12px 16px` → `var(--density-padding, 12px 16px)` sur `.a11y-section__item`, `margin-bottom: 16px` → `var(--density-gap, 12px)` sur `__list`, `gap: 12px` → `var(--density-gap, 12px)` sur `__actions`
- **handleReset applyNull redondant (LOW)** : `applyAccessibilitePrefs(null)` supprime dans `handleReset` — le `useEffect` sur `prefs` applique deja les DEFAULTS (tous false = supprime toutes les classes)

### preference.didacticiel (refactoring — backend-driven tutorials)

- **Tutoriels backend** : les definitions de tutoriels deplacees des manifests frontend (`index.ts`) vers les manifests backend (`manifest.py`) via le nouveau champ `tutorials` de `FeatureManifest`
- **Nouvel endpoint `GET /tutorials`** : retourne les tutoriels filtres par permissions effectives de l'utilisateur (`load_user_permissions()`) et tries par l'ordering admin — le frontend ne recoit que ce qu'il peut voir
- **3 nouveaux schemas** : `TutorialStepResponse`, `PermissionTutorialResponse`, `FeatureTutorialResponse`
- **`collect_all_tutorials()`** : nouvelle methode dans `FeatureRegistry`, meme pattern que `collect_all_events()`
- **Frontend simplifie** : `TutorialContext.tsx` remplace `import.meta.glob` + 2 useMemo (raw + ordering) par un unique appel API `GET /tutorials`
- **7 index.ts nettoyes** : suppression de `featureTutorial` et de l'import `FeatureTutorial` dans `_identity`, `notification`, `rgpd`, `event`, `mfa`, `sso`, `preference`
- **SCSS border-radius pill badges** : 2 occurrences `border-radius: 10px` corrigees en `var(--radius)` (`.tutorial-feature__seen-badge`, `.tutorial-tooltip-step`)

## 2026.02.47

### preference.didacticiel (revue complete — 6 fixes + events)

- **Rules of Hooks violation (HIGH)** : `useEffect` et `useCallback` appeles apres un `return null` conditionnel dans `TutorialAdminSection` — hooks deplaces avant le early return pour etre toujours inconditionnels
- **Classe CSS cible manquante (MEDIUM)** : les steps de tutoriel ciblaient `.tutorial-section` mais le root div de `TutorialSection` n'avait pas cette classe — ajout de `tutorial-section` au className
- **SCSS border-radius hardcodes (MEDIUM)** : 10 occurrences `border-radius: Npx` remplacees par `var(--radius)` (items, feature groups, stats cards, highlight ring, tooltip, notification, admin items, sub-items, bottom sheet)
- **SCSS density variables manquantes (MEDIUM)** : 5 paddings hardcodes remplaces par `var(--density-padding)` / `var(--density-card-padding)`, 4 gaps remplaces par `var(--density-gap, 12px)`, mobile highlight override supprime (redondant)
- **RGPD sessionStorage sans consent (LOW)** : ecritures `tutorial_active` et `tutorial_pending_dismissed` gatees par `hasConsent('functional')` — les `removeItem` (cleanup) restent non-gates
- **Dependency manquante useEffect (LOW)** : `active` ajoute au dependency array du useEffect de detection des permissions non vues
- **Events non emis (ajout)** : import `event_bus`, emission `preference.updated` sur `POST /seen` (mark), `DELETE /seen` (reset), `PUT /ordering` (admin)

## 2026.02.46

### preference.langue (revue complete — 5 fixes)

- **axios brut sans auth (HIGH)** : `import axios` remplace par `import api` — le PUT `/api/preferences/language` echouait en 401 (pas de JWT attache), le `catch` masquait l'erreur. Le changement de langue ne fonctionnait pas
- **Double sauvegarde (MEDIUM)** : le frontend appelait PUT `/api/preferences/language` puis `updatePreference()` qui rappelait PUT `/auth/me/preferences` — flow clarifie avec stockage du nouveau token
- **LOCALE_LABELS duplique + accents manquants (LOW)** : dict identique dans `i18n/routes.py` et `preference/langue/routes.py`, extrait dans `api/src/core/i18n/locale_labels.py` (source unique). Accents corriges : Francais → Français, Espanol → Español, Portugues → Português
- **Event preference.updated non emis (LOW)** : le manifest parent declare l'event mais le PUT endpoint ne l'emettait pas — ajout de `event_bus.emit("preference.updated", ...)` avec payload (old/new language, IP)
- **JWT lang claim stale (LOW)** : apres changement de langue, le JWT gardait l'ancien claim `lang` jusqu'au refresh — le PUT retourne maintenant un `access_token` frais avec le claim mis a jour, stocke immediatement par le frontend

## 2026.02.45

### preference.composants (revue SCSS — 8 fixes)

- **SCSS hardcoded gaps/margins** : `gap: 20px`, `margin-bottom: 16px`, `gap: 16px`, `gap: 12px` remplaces par `var(--section-gap, 24px)` et `var(--density-gap, 12px)`
- **Radio button padding hardcode** : `padding: 8px 16px` remplace par `var(--density-btn-padding, 8px 16px)`
- **Toggle-row padding hardcode** : `padding: 10px 0` remplace par `var(--density-btn-padding, 8px 16px)`
- **Preview padding/gap hardcode** : `gap: 16px`, `padding: 16px` remplaces par `var(--density-gap, 12px)` et `var(--density-card-padding, 24px)`
- **Preview-card padding hardcode** : `padding: 16px 24px` remplace par `var(--density-card-padding, 24px)`
- **Modal animations ajoutees** : keyframes `slide-up` et `scale-up` + selecteurs `[data-modal-anim]` pour none/slide/scale
- **Table stripes** : style de base + dark theme + toggle `.no-table-stripes` + `.no-list-separators`
- **applyComposantsPrefs(null) redondant supprime** : appel superflu dans `handleReset()`, deja gere par `setDraftPreference` + `useEffect`
- **Preview-btn selecteurs supprimes** : `.composants-section__preview-btn` dans `[data-btn-style]` n'existait pas dans le DOM

### preference.couleur (revue SCSS — 12 fixes)

- **Margins/gaps hardcodes** : `margin-bottom: 16px/20px/24px/12px`, `gap: 8px/12px` remplaces par `var(--density-gap, 12px)` et `var(--section-gap, 24px)`
- **Tab padding hardcode** : `padding: 8px 20px` remplace par `var(--density-btn-padding, 8px 16px)`
- **Item padding hardcode** : `padding: 6px 10px` remplace par `var(--density-input-padding, 8px 12px)`
- **Picker dimensions en px** : `width/height: 28px` converties en `1.75rem`
- **Picker border-radius hardcode** : `border-radius: 4px/2px` remplaces par `calc(var(--radius) * 0.5)` et `calc(var(--radius) * 0.25)`
- **Picker padding en px** : `padding: 2px` converti en `0.125rem`
- **Hex min-width en px** : `min-width: 60px` converti en `3.75rem`
- **Reset button padding/radius** : `padding: 2px 4px` converti en `0.125rem 0.25rem`, `border-radius: 4px` remplace par `calc(var(--radius) * 0.5)`
- **Actions margin-top hardcode** : `margin-top: 8px` remplace par `var(--density-gap, 12px)`

### preference (sections TSX)

- **Classe CSS specifique par section** : ajout de `preference-*-section` sur chaque conteneur root (theme, layout, couleur, composants, accessibilite) pour ciblage CSS precis

## 2026.02.44

### preference.layout (revue complete — 7 fixes)

- **maxWidth default mismatch (MEDIUM)** : le fallback CSS `--content-max-width` etait 1200px mais l'option "Normal" = 960px — l'utilisateur voyait "Normal (960px)" mais avait 1200px de largeur effective, et "Wide (1200px)" ne faisait rien. Corrige : fallback CSS aligne a 960px dans `_body.scss`, CLAUDE.md mis a jour
- **sectionGap default mismatch (MEDIUM)** : le default du slider (16px) ne correspondait pas au fallback CSS (24px) — le slider montrait 16px alors que le gap effectif etait 24px. Corrige : DEFAULTS.sectionGap = 24, comparaisons alignees dans `applyPreferences.ts` et `DraftPreferenceContext.tsx`
- **Inline style preview box** : `style={{ borderRadius }}` sur le radius-box de preview violait la regle "aucun style inline". Remplace par `border-radius: var(--radius, 8px)` en SCSS
- **SCSS hardcoded gaps/margins** : `gap: 20px`, `margin-bottom: 16px`, `gap: 12px` remplacees par `var(--section-gap, 24px)` et `var(--density-gap, 12px)`
- **Badge value hardcoded radius** : `border-radius: 10px` remplace par `var(--radius, 8px)` (aligne avec font.scss)
- **Radio button padding hardcode** : `padding: 8px 16px` remplace par `var(--density-btn-padding, 8px 16px)`
- **applyLayoutPrefs(null) incomplet** : le branch null ne nettoyait pas `--density-card-padding`, `--density-btn-padding`, `--density-input-padding` — valeurs fantomes possibles au discard. +3 removeProperty + suppression appel redondant dans handleReset

## 2026.02.43

### preference.font (revue complete — 2 fixes + bundle local fonts)

- **Polices bundlees localement** : toutes les polices de preference (Inter, Roboto, Open Sans, Atkinson Hyperlegible, OpenDyslexic) sont desormais servies en local depuis `public/fonts/` au lieu de Google Fonts CDN — suppression des 3 balises `<link>` Google Fonts de `index.html`, ajout de 18 declarations `@font-face` dans `_fonts.scss` (~600 KB woff2 total). Zero requete externe, fonctionne offline
- **OpenDyslexic fonctionnel** : la police etait referencee dans 3 fichiers (FontSection, applyPreferences, accessibilite.scss) mais jamais chargee (pas disponible sur Google Fonts). Corrige via bundle local woff2
- **`applyFontPrefs(null)` redondant supprime** : appel superflu dans `handleReset()` de FontSection, deja gere par `setDraftPreference` + `useEffect`

## 2026.02.42

### preference.theme (integration wallpaper dans le draft system)

- **BackgroundThemePicker en mode draft** : ajout des props `onSelect` et `currentValue` pour integrer le picker dans le systeme de brouillon des preferences (preview live + sauvegarde groupee via save-bar)
- **DraftPreferenceContext** : ajout de `backgroundTheme` dans les cles de preferences gerees — preview visuel instantane, revert on discard, detection de changement dans la save-bar
- **ThemeSection** : le picker de fond d'ecran utilise desormais le draft system au lieu de sauvegarder immediatement
- **App.tsx** : le raccourci Alt+T et le picker ne s'affichent que si la feature `preference.theme` est active
- **BackgroundThemePicker isDark reactif** : utilisation d'un MutationObserver pour reagir aux changements de theme en temps reel (previews light/dark corrects)
- **Permissions** : ajout de `require_permission("preference.read")` sur les endpoints GET/PUT `/me/preferences`
- **Event** : declaration de `preference.updated` dans le manifest preference + emission dans le PUT `/me/preferences`
- **SCSS** : remplacement de 7 valeurs hardcodees par les CSS variables du systeme (`--radius`, `--density-card-padding`, `--density-gap`, `--density-padding`) dans `_bg-theme-picker.scss`
- **i18n** : ajout des cles `pref_label_background_theme` et `format_bg_theme` (fr + en)

## 2026.02.41

### preference (revue parent — 4 bugs corriges)

- **require_permission sur 6 endpoints** : ajout de `require_permission()` sur les 6 endpoints non proteges — `GET/POST/DELETE /seen` et `GET /ordering` (didacticiel), `GET/PUT /language` (langue). Le `GET /ordering` etait accessible sans authentification
- **Manifest parent children incomplet** : ajout des 4 enfants manquants (`preference.font`, `preference.layout`, `preference.accessibilite`, `preference.composants`) a la liste `children` du manifest parent
- **Gestion d'erreur saveAll()** : ajout try/catch dans `DraftPreferenceContext.saveAll()` — le snapshot n'est plus mis a jour en cas d'echec API, un message d'erreur s'affiche dans la save-bar (i18n fr + en)
- **SCSS variables de densite** : remplacement des paddings/margins/gaps hardcodes par les CSS variables du systeme de preferences (`--density-padding`, `--density-gap`, `--density-btn-padding`, `--density-input-padding`, `--density-card-padding`, `--section-gap`) dans `preference.scss`, `preferenceTabs.scss` et `unsavedChangesModal.scss`

## 2026.02.40

### notification.webhook (revue complete)

- **3 bugs permissions HIGH corriges** : `delete_webhook` verifiait `global.update` au lieu de `global.delete`, `test_webhook` verifiait `global.update` au lieu de `global.read`, routes globales PUT/DELETE sans filtre `is_global=True` (pouvaient manipuler des webhooks personnels)
- **Delivery logs incomplets** : les webhooks matches par rules ne passaient pas `webhook_id`/`event_id` a l'enqueue — livraisons non trackees dans `WebhookDeliveryLog` (corrige dans `notification/services.py`)
- **4 events declares et emis** : `notification.webhook.created`, `.updated`, `.deleted`, `.tested` — ajout au manifest + emissions dans les 7 routes CRUD
- **Validation format** : `format: str` remplace par `Literal["custom", "slack", "discord"]` dans les schemas Pydantic
- **SCSS** : 14 `border-radius` hardcodes remplaces par `var(--radius)`, density variables appliquees (`.notif-webhook-card`, `.notif-webhook-list`, `.notif-event-checkboxes`)
- **Test webhook** : la livraison test est maintenant loggee dans `WebhookDeliveryLog`, reponse HTTP non-2xx retourne 502 au lieu de 200
- **Documentation** : `docs/core/notification/webhook/README.md`

## 2026.02.39

### notification.push (resend + error handling)

- **Colonne Push dans le tableau admin** : affichage de `push_sent_at` avec checkmark vert + date, bouton resend push (permission `notification.push.resend`)
- **Gestion erreur push prompt** : si le navigateur bloque les notifications, affiche un message d'erreur contextuel (denied vs generic) au lieu de fermer silencieusement
- **Traductions push** : ajout des cles `push_prompt_error_denied`, `push_prompt_error_generic`, `admin_column_push`, `admin_resend_push_button`, `confirm_resend_push_*`, `alert_push_sent_title` (fr + en)
- **SCSS** : ajout `.push-prompt-error` + fix 4 `border-radius` hardcodes → `var(--radius)`

### sso (refactoring SSO loading)

- **`SSOSection` component** : nouveau composant qui encapsule le chargement SSO (lazy `SSOButtons` + providers depuis `AppSettingsContext`)
- **`SSOButtons`** : recoit `providers` en props au lieu de fetch autonome — suppression du `useEffect` + `useState` interne
- **`AppSettingsContext`** : expose `providers: SSOProvider[]` depuis `/api/settings/public` + `settled` (true apres premier fetch)
- **`LoginPage`** : remplace le bloc SSO inline par `<SSOSection />`

### fix (chargement login + theme public)

- **Login sans skeleton** : les pages publiques ne bloquent plus sur `authLoading`/`featuresLoading` — rendu immediat
- **Theme public** : suit la preference navigateur (`prefers-color-scheme`) au lieu d'un theme aleatoire
- **i18n eager** : les traductions `_identity` sont chargees en synchrone (import eager) — plus de flash/fallback sur la page login
- **MeshBackground** : suppression du deck shuffle (sessionStorage) — fond fixe variant 8 sur les pages publiques
- **TutorialWrapper** : conditionne a `user` authentifie (evite crash sur pages publiques)
- **Vite HMR** : suppression du `port` redondant dans la config HMR (seul `clientPort` est necessaire)

## 2026.02.38

### mfa.email (revue complete)

- **`require_permission("mfa.email.setup")`** ajoute sur 3 endpoints (`/enable`, `/send-disable-code`, `/disable`) — alignement avec `mfa.totp`
- **Check `EMAIL_ENABLED`** avant activation email MFA — empeche le lock-out si SMTP non configure
- **Propagation erreur SMTP** : `send_email_otp()` retourne HTTP 502 si l'envoi echoue au lieu d'un faux "Code envoye"
- **Backup codes affiches** : le frontend capture et affiche les backup codes a l'activation email MFA (comme TOTP)
- **Fix `json.loads` sur preferences** : `verify_mfa` gere correctement les preferences JSONB (dict natif, plus de `TypeError`)
- **Documentation** : `docs/core/mfa/email/README.md` cree

### _identity (email case-insensitive)

- **Index unique `LOWER(email)`** sur la table `users` — empeche les doublons de casse (`Nathan@...` vs `nathan@...`)
- **Migration Alembic** `o8p9q0r1s2t3` : normalise les emails existants en minuscule, remplace l'index
- **Modele SQLAlchemy** : `User.email` utilise `Index("ix_users_email", func.lower(email), unique=True)` dans `__table_args__`
- **`.lower()` systematique** sur tous les points d'entree email :
  - Login (`routes_auth.py`)
  - `authenticate_user()` service (protege la creation auto intranet)
  - Update profil utilisateur
  - Admin create/update user (2 endpoints : par ID + par UUID)
  - MFA email address sync (2 occurrences)
  - Admin promotion `DEFAULT_ADMIN_EMAIL` dans `main.py`

## 2026.02.37

### _identity (assignment_rules DB-driven)

- **`assignment_rules`** : nouveau champ JSONB sur la table `permissions` — controle ou une permission peut etre assignee (`user`, `role`, `global`). Defaut : tout autorise. Seules les exceptions sont configurees via le fichier fixtures `permission_assignment_rules.py`
- **`mfa.bypass` user-only** : `{"user": true, "role": false, "global": false}` — ne peut etre assigne que sur le profil d'un utilisateur, jamais via un role ni en global
- Suppression du hardcode `USER_ONLY_PERMISSIONS` dans 6 fichiers (backend + frontend) — remplace par lecture du champ `assignment_rules` en DB
- Le frontend (`PermissionsAdminPage`) utilise `assignment_rules.global` de l'API pour masquer les permissions non-assignables globalement
- **Sync au demarrage** : les rules des fixtures sont re-appliquees a chaque restart (idempotent)
- **Migration Alembic** : ajout colonne + seed `mfa.bypass`
- **`PermissionResponse`** : nouveau champ `assignment_rules` dans le schema API

### mfa (events + corrections)

- **4 nouveaux events** : `mfa.verify_failed`, `mfa.backup_code_used`, `mfa.policy_deleted`, `mfa.bypassed` (12 events total)
- **`mfa.bypass`** : bypass absolu (ignore toutes les regles MFA y compris role policies), assigne uniquement per-user via `UserPermission`
- **`/auth/me`** : retourne `mfa_setup_required` et `mfa_grace_period_expires` dynamiquement (sync F5)
- **Fix 500 PUT /api/mfa/policy** : CHECK constraint `allowed_methods` accepte JSONB null
- **Documentation** : `docs/core/mfa/README.md` mis a jour (12 events, bypass user-only, assignment_rules)

### fix

- **`main.tsx`** : suppression import `React` inutilise (TS6133)

## 2026.02.36

### backgrounds (9 fonds + random login)

- **5 nouveaux fonds d'ecran** : Aurore boreale (CSS orbes + hue-rotate), Vagues (SVG layers animes), Grain degrade (CSS gradient + SVG noise filter), Grille neon (repeating-linear-gradient + pulse), Constellations (canvas etoiles + lignes connexion)
- **Picker Alt+T en grille 3x3** : passage de 4 a 9 options, modal elargi, previews adaptes dark/light
- **Fond aleatoire sur pages publiques** : sur login/register, un fond aleatoire parmi les 9 est choisi a chaque chargement de page
- **Theme dark/light aleatoire sur pages publiques** : le theme bascule aleatoirement avec 75% de probabilite de garder le meme qu'au chargement precedent (sessionStorage)
- **Chargement login sans flash** : theme random applique dans l'IIFE pre-render (main.tsx), skeleton login (shimmer) pendant le loading auth, placeholder SSO pour eviter le saut de layout
- **Skeleton contextuel** : skeleton login uniquement sur pages publiques (pas de token), rien sur les pages authentifiees
- **Transition login → preferences** : apres connexion, le fond et theme de l'utilisateur reprennent immediatement (lecture `data-bg-theme` au changement de mode)
- **Deck shuffle** : les 9 fonds defilent sans repetition tant que tous n'ont pas ete affiches (sessionStorage)
- **i18n** : traductions FR et EN pour les 5 nouveaux fonds

## 2026.02.35

### sso (revue + corrections)

- **Permission `sso.link`** ajoutee sur `POST /sso/google/link` et `POST /sso/github/link` — coherence avec GET/DELETE `/sso/accounts`
- **State validation** : `except JWTError` au lieu de `except Exception` — le check de provider mismatch n'est plus avale par le catch generique
- **IP dans payload `sso.login`** : Google inclut desormais l'IP comme GitHub — audit trail coherent
- **Permissions mortes retirees** : `sso.google.login` et `sso.github.login` supprimees des manifests (declarees mais jamais verifiees)
- **Auto-link audite** : emission `sso.account_linked` (avec `auto_linked: true`) quand un user existant est lie automatiquement par email
- **Modal localisee** : `window.confirm()` remplace par `useConfirm()` (ConfirmModal i18n) dans SSOAccountLinks
- **i18n cleanup** : cles inutilisees `continuer_avec_google` / `continuer_avec_github` supprimees

## 2026.02.34

### event (refonte)

- **Journal des evenements** : `EventsPage` redesigne — liste paginee des evenements reels (plus un catalogue), recherche, tri par colonne, toggle "tous les utilisateurs" (`event.read_all`), payloads expandables
- **Page Types d'evenements** : nouveau `EventTypesPage.tsx` (catalogue des event types, permission `event.types`)
- **Backend `list_events`** : nouvel endpoint `GET /api/events/` avec pagination, search, sort, filtre par type et par utilisateur
- **Permissions** : ajout `event.read_all` et `event.types` dans le manifest
- **Migration Alembic** : suppression de la colonne `redirect_token` sur le modele Event
- **Suppression `admin_only`** sur les event types

### _identity (audit trail complet)

- **Emissions d'evenements** sur toutes les actions critiques : `user.login`, `user.password_changed`, `user.password_reset`, `user.email_verified`, `user.deleted`, `user.account_deleted`, `user.roles_updated`, `role.created`, `role.updated`, `role.deleted`, `role.permissions_updated`, `admin.impersonation_stopped`, `admin.password_reset_triggered`, `admin.global_permissions_updated`, `admin.feature_toggled`, `admin.settings_updated`
- **Manifest events** : 20 event types declares (authentification, utilisateurs, roles, administration)
- **`email_verified_at`** : nouveau champ timestamp sur User (migration Alembic), set lors de la verification email

### sso (hardening + audit)

- **Blocage comptes desactives** : SSO login et auto-link rejetes pour les utilisateurs desactives/supprimes
- **Utilisateurs SSO verifies** : `email_verified=True` + `email_verified_at` a la creation
- **Permissions ajoutees** : `sso.link` requis sur `GET /sso/accounts` et `DELETE /sso/accounts/{id}`
- **Manifest events** : 8 event types declares (`sso.login`, `sso.user_created`, `sso.account_linked`, `sso.account_unlinked`, `sso.link_rejected`, `sso.unlink_blocked`, `sso.login_failed`, `sso.link_failed`)
- **Emissions d'evenements** sur toutes les actions SSO (login, link, unlink, echecs)

### feature_registry

- **Tri deterministe** : `collect_all_permissions`, `collect_all_events`, `get_manifest_data_for_frontend` retournent des resultats tries par feature puis par code/event_type

### navigation

- **`exact` matching** : propriete `exact` sur `NavItem` pour match de route exact (evite les faux positifs sur routes parentes)
- **Icone `list`** ajoutee dans le registre d'icones
- **`UserMenu`** : `isMenuActive` supporte le 2e argument `exact`

### i18n

- **Accept-Language** : tri par quality factor (`q=`) — le middleware retourne desormais la locale preferee selon la priorite RFC, pas le premier match
- **Routes API** : les defaults des Query params `/translations` et `/namespaces` utilisent `settings.I18N_DEFAULT_LOCALE` au lieu de `"fr"` hardcode
- **Namespace discovery** : `_derive_namespace` filtre desormais uniquement `__*` (dirs Python internes) au lieu de `_*` — toute feature `_xxx` est decouverte sans hardcode
- **Traductions EN** : toutes les features ont des traductions anglaises completes (en.json)

### notification.email

- **Templates email i18n** : les 4 methodes d'envoi (`send_notification`, `send_reset_password`, `send_invitation`, `send_verification_code`) utilisent desormais `t("email.*", locale)` au lieu de texte francais hardcode — les emails respectent la langue de l'utilisateur

## 2026.02.33

### _identity

- **Colonne Roles** dans la page admin Users : badges colores avec couleur dynamique depuis la DB
- **Filtre par role** : composant MultiSelect dans la toolbar (multi-selection, recherche, dots de couleur)
- **Bouton Impersonate masque** pour les utilisateurs immuns (`impersonation.immune`) et pour soi-meme
- **Champ `color`** sur le modele Role (hex `#RRGGBB`, migration Alembic avec couleurs par defaut)
- **Color picker** dans les modals create/edit de la page Roles admin avec preview badge
- **Backend `list_users`** reecrit : batch-load roles, calcul immunite impersonation, filtre `role_ids`
- **Nouveaux schemas** : `UserListItem`, `UserListPaginatedResponse`, `RoleBasic.color`
- **Composant `MultiSelect.tsx`** reutilisable (dropdown, search, checkboxes, color dots)
- **SCSS** : `.badge-role` avec `color-mix()` + dark theme, `.color-picker-row`
- **Exception CLAUDE.md** : CSS custom properties `--var-name` autorisees pour valeurs DB

## 2026.02.32

### Background tasks (ARQ + Redis)

- Worker ARQ (`api/src/worker.py`) pour les jobs asynchrones (email, webhook, push)
- Helper `enqueue()` (`api/src/core/tasks.py`) pour publier vers la queue Redis
- Service Redis + worker ajoutes dans `docker-compose.yml`
- `notification/services.py` : livraison via queue background au lieu de synchrone, `RedisSSEBroadcaster` pour SSE multi-instance

### Securite & rate limiting

- `middleware_security.py` : headers securite (HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- `rate_limit.py` : rate limiting slowapi + protection brute-force login (5 tentatives/email/15min, 20/IP/15min)
- Rate limits appliques aux endpoints auth : login (5/min), register (3/min), forgot-password (3/min), reset-password (5/min), verify-email (5/min)

### Performance

- Cache TTL in-process pour les permissions utilisateur (`permissions.py`) — 1000 entrees, 5min TTL, invalidation manuelle
- `config.py` : nouvelles settings pool DB, CORS, rate limiting, cache permissions, Redis URL
- `ACCESS_TOKEN_EXPIRE_MINUTES` reduit de 1440 (24h) a 15 minutes
- i18n frontend : chargement lazy des namespaces feature via `i18next-resources-to-backend`

### Frontend robustesse

- `ErrorBoundary.tsx` : composant Error Boundary React avec i18n + dark/light theme
- `api.ts` : mutex sur le refresh token pour eviter les appels concurrents, queue des requetes 401
- `App.tsx` : route catch-all vers `/` pour les chemins inconnus

### Infrastructure & CI

- Dockerfile app : `oven/bun:latest` (aligne sur CI)
- Migration Alembic `k4l5m6n7o8p9` : sync feature state `notification.push` depuis env `PUSH_ENABLED`
- CI : demarrage Redis en plus de DB, wait Redis, verification demarrage worker ARQ
- Commande dev `.claude/commands/dev-reset.md`

## 2026.02.31

### SSO — fix callback double-call et route statique

- Route `/sso/callback/:provider` rendue statique dans `App.tsx` (ne depend plus du feature state)
- Suppression de la route dupliquee dans le manifest SSO (`index.ts`)
- Guard module-level `processedCodes` dans `SSOCallbackPage` (remplace `useRef` qui ne survit pas aux remontages)

### Impersonation — fix permissions et UX

- Fix 403 sur `/impersonation/search-users` : resolution de l'admin original pendant l'impersonation pour le check de permissions
- Exclusion des super_admin et de l'utilisateur impersonne des resultats de recherche
- Full page reload au demarrage de l'impersonation (charge les preferences du user impersonne)
- Bypass des regles RGPD (accept-legal) et MFA (force-setup) pendant l'impersonation dans `ProtectedRoute`

### AcceptLegalPage — fix React warning

- Deplacement du `navigate()` de la phase de rendu vers `useEffect` (fix "Cannot update BrowserRouter while rendering")

### Roles — slug technique et name non-unique

- Contrainte unique retiree sur `roles.name` (name = nom d'affichage, peut etre duplique)
- Migration `j3k4l5m6n7o8` : drop de la contrainte `roles_name_key`
- Alignement du modele Role avec les contraintes DB (`__table_args__` explicite)

### Fixtures et seed

- Reorganisation des imports dans `seed.py` (fix E402 ruff)

## 2026.02.30

### CI/CD — Corrections et CI locale

- Ajout du `bun.lock` (requis pour `bun install --frozen-lockfile`)
- Ajout de `ruff.toml` : configuration linter Python (regles E, W, F, I — ignore E712 pour SQLAlchemy)
- Fix de 51 erreurs ruff (imports non tries, imports inutilises, variable non utilisee)
- Restructuration du workflow CI : fusion des jobs `build` et `migrations-check` en un seul
- CI executable en local via `act push` (nektos/act) — ajout `.actrc` a la racine
- `ci.yml` : utilise `-f docker-compose.yml` pour skip l'override dev en CI

### Fix modeles SQLAlchemy — alignement DB/models pour alembic check

- `Event.actor_id` : ajout `ForeignKey("users.id")` manquant
- `NotificationRule` : ajout index GIN `ix_notification_rules_event_types_gin` sur `event_types`
- `Webhook` : ajout index GIN `ix_webhooks_event_types_gin` sur `event_types`
- `SecurityToken.uuid` : declaration explicite `UniqueConstraint` + `Index(unique=True)` dans `__table_args__` (fix reflection Alembic UUID)

### Bootstrap automatique — start pret a l'emploi

- `api/entrypoint.sh` (NEW) : lance `alembic upgrade head` automatiquement au demarrage Docker
- `api/Dockerfile` : utilise `entrypoint.sh` au lieu d'un CMD direct, alembic bake dans l'image
- Migration Alembic `fixtures_bootstrap` : insere roles, permissions, global_permissions, feature states, app settings — une seule fois
- `SUPER_ADMIN_ROLE_SLUG` configurable dans `.env` (defaut: `super_admin`)
- Promotion auto de `DEFAULT_ADMIN_EMAIL` → role super_admin + flag au demarrage

### Refonte securite : is_super_admin → role-based

- `is_super_admin` ne bypasse plus les permissions — c'est un marqueur visuel uniquement
- Seules les permissions (via roles + global_permissions) autorisent l'acces
- `permissions.py` : retire le bypass `is_super_admin` dans `require_permission()` et `get_user_permission_codes()`
- `security.py` : `_is_super_admin()` verifie le role uniquement, plus le flag
- Routes notification/webhook/event : remplace `is_super_admin` par des checks de permissions
- Frontend (`ProtectedRoute`, `useNavigationItems`) : utilise `can(permission)` au lieu de `is_super_admin`

### Deplacement alembic dans api/ + Docker dev/CI split

- `alembic/` deplace de la racine vers `api/alembic/` (tout le backend regroupe)
- `docker-compose.yml` : config base sans bind mounts (fonctionne en CI/act/prod)
- `docker-compose.override.yml` (NEW) : volumes dev hot-reload (charge auto en local)

### Commande /commit

- Nouvelle commande `/commit` : detection auto de `act`, CI complete via `act push`, version bump, git add/commit
- `seed.py` simplifie (fixtures gerees par la migration)

## 2026.02.29

### Simplification du versioning et des changelogs

- Suppression des 14 changelogs par feature — un seul `CHANGELOG.md` centralise a la racine
- Suppression du champ `version` des 30 `manifest.py` — le versioning est desormais porte uniquement par `package.json`, `main.py` et le changelog global
- Suppression de la colonne "Version" dans la page admin Features
- Mise a jour du `FeatureManifest` dataclass (retrait du champ `version`), du schema `FeatureResponse`, et du endpoint dependency graph
- Mise a jour du type TypeScript `FeatureManifest` (retrait du champ `version`)
- Mise a jour de `CLAUDE.md` : checklist simplifiee a 3 fichiers, suppression des references aux changelogs par feature et aux versions dans les manifests
- Consolidation du contenu des changelogs features dans le changelog global avant suppression (aucune information perdue)

### Corrections et ameliorations

- Ajout `showSupportNotice: false` dans la config i18next (suppression du message console)
- Ajout des future flags React Router v7 (`v7_relativeSplatPath`, `v7_startTransition`) dans `BrowserRouter`
- Ajout du `favicon.ico` pour compatibilite navigateurs anciens

## 2026.02.28

### SECRET_KEY production

- Remplacement de la cle par defaut `dev_secret_key_change_in_production` par une cle cryptographique 256 bits
- `.env.example` mis a jour avec placeholder `CHANGE_ME_IN_PRODUCTION`

### CI/CD — GitHub Actions

- Nouveau workflow `ci.yml` : lint backend (ruff), lint frontend (tsc --noEmit), build Docker, check migrations Alembic
- Nouveau workflow `deploy.yml` : deploiement configurable SSH ou cloud via `workflow_dispatch` (parametres `target` et `environment`)

### Nouvelle feature : i18n (internationalisation)

- Systeme i18n complet avec traductions decentralisees par feature
- Middleware `I18nMiddleware` : resolution locale (JWT `lang` > `Accept-Language` > defaut)
- Moteur de traductions backend avec decouverte automatique des JSON (`core/*/i18n/`, `features/*/i18n/`)
- Fonction `t(key, locale, **kwargs)` pour traduire cote backend
- Routes publiques : `GET /api/i18n/locales`, `GET /api/i18n/translations`, `GET /api/i18n/namespaces`
- Frontend : i18next + react-i18next avec decouverte automatique via `import.meta.glob`
- `I18nProvider` : synchronise la langue utilisateur avec i18next et `document.documentElement.lang`
- Traductions FR extraites pour toutes les features existantes (catalogue pret, integration TSX ulterieure)
- Config : `I18N_DEFAULT_LOCALE`, `I18N_SUPPORTED_LOCALES`

### Nouvelle sous-feature : preference.langue

- Nouvel onglet "Langue" dans la page Preferences
- Endpoints `GET/PUT /api/preferences/language` avec validation contre les locales supportees
- Mise a jour `User.language` + `User.preferences.language` + changement i18next en temps reel
- Cards radio avec indicateur de langue par defaut

### _identity — Colonne language + JWT lang

- Nouvelle colonne `User.language` (defaut `fr`) avec migration Alembic
- Ajout du claim `lang` dans le JWT sur les 7 points de creation de token (login, refresh, email verification, invitation, impersonation stop, SSO, MFA)
- Impersonation : `create_impersonation_token` inclut la langue du target user

### notification — Parametre locale emails

- Ajout parametre `locale: str = "fr"` sur les 4 methodes publiques du service email (`send_notification`, `send_reset_password`, `send_invitation`, `send_verification_code`)

### Traductions i18n (catalogue complet)

- `_identity` : ~500+ cles FR (18 pages/composants)
- `preference` parent + 7 sous-features : ~160 cles FR
- `preference.didacticiel` : 33 cles FR
- `notification` : 112 cles FR
- `rgpd` : ~170 cles FR
- `mfa` : 107 cles FR
- `sso` : 22 cles FR
- `event` : 17 cles FR
- `storybook` : 211 cles FR
- Traductions globales communes : 64 cles FR
- Fichiers `en.json` (stubs) crees pour chaque feature

## 2026.02.27

### Refactoring SCSS global

- **styles** : decoupage de `global.scss` (3 868 lignes) en 29 fichiers partiels dans `styles/components/`
- Chaque composant UI isole dans son propre fichier (`_buttons.scss`, `_forms.scss`, `_cards.scss`, `_modal.scss`, `_tables.scss`, `_unified-table.scss`, etc.)
- Dark theme colocated avec chaque composant (plus de bloc monolithique)
- `global.scss` devient un index de `@use` uniquement
- `animations.scss` inchange (bien organise a 439 lignes)

### Nouvelle feature : storybook

- **storybook** : catalogue visuel des composants UI de l'application
- 8 onglets : Typographie, Boutons, Formulaires, Cartes & Modals, Tableaux, Badges & Alertes, Navigation, Divers
- Accessible via `/admin/storybook` (permission `storybook.read`)
- Feature core independante avec manifest backend + frontend
- Ajout de l'icone `palette` dans la navigation

## 2026.02.26

### Enforcement des permissions (backend + frontend)

- **notification** : toutes les routes migrees vers `require_permission()` (notification.read, .delete, .admin, .rules.*)
- **notification.webhook** : ajout permissions `notification.webhook.global.update` et `.global.delete`, toutes les routes migrees vers `require_permission()`
- **notification.push** : ajout `require_permission()` sur subscribe et status
- **notification.email** : suppression permission morte `notification.email.send`
- **event** : ajout `require_permission("event.read")` sur la route `/event-types`
- **_identity** : ajout permission `invitations.delete`, correction route DELETE invitations, migration routes impersonation vers `require_permission()`
- **rgpd** : routes admin droits GET migrees de `.manage` vers `.read`, boutons CRUD frontend proteges par `can()`
- **sso** : suppression permission morte `sso.manage`
- **mfa** : implementation `mfa.bypass` — les utilisateurs avec cette permission sautent le MFA

### Migration frontend requireSuperAdmin → permissions granulaires

- **App.tsx** : 9 routes admin migrees de `requireSuperAdmin` vers `permission="xxx"`
- **_identity/index.ts** : 7 navItems admin migres vers `permission`
- **NotificationSettings** : sections globales migrees de `isSuperAdmin` vers `can()`
- **AdminRGPDPage** : onglets droits/pages proteges par `.read`, boutons CRUD par `.manage`
- **8 pages admin** : ajout `can()` pour proteger boutons CRUD (UsersAdmin, UserDetail, RolesAdmin, PermissionsAdmin, FeaturesAdmin, AppSettings, Database, Commands)

### Didacticiels (29 nouveaux tutoriels)

- **preference** (8) : theme, couleur, font, layout, composants, accessibilite, didacticiel.read, didacticiel.manage
- **rgpd** (8) : consentement.read, export.read, droits.read, consentement.manage, droits.manage, politique.manage, audit.read, registre.manage
- **notification** (5) : push.subscribe, webhook.create, webhook.read, rules.update, rules.delete
- **_identity** (8) : users.update, users.delete, roles.update, roles.delete, permissions.read, permissions.manage, invitations.read, invitations.create

### Feature gate middleware

- Nouveau `FeatureGateMiddleware` : toutes les routes de features non-core sont verifiees en temps reel. Feature desactivee → 404 immediat, sans restart serveur
- Toutes les routes sont desormais enregistrees au demarrage (plus de skip conditionnel), le middleware gere le gating
- Cascade correcte : desactiver une feature parente desactive automatiquement ses enfants et dependants

### Roles et permissions globales

- 21 permissions globales configurees (preferences, notifications perso, MFA, SSO, RGPD perso, recherche)
- 4 nouveaux roles : Utilisateur (14 perms), Moderateur (30), Auditeur RGPD (22), Gestionnaire contenu (19)
- Role `super_admin` mis a jour avec toutes les permissions (73)
- Nettoyage DB : permissions mortes `sso.manage` et `notification.email.send` supprimees

### Corrections tutoriels + onglet Invitations

- **TutorialEngine** : comparaison URL complete (pathname + search) pour naviguer correctement vers les onglets `?tab=xxx`
- **PreferencePage** : support `?tab=theme|couleur|font|layout|composants|accessibilite` via `useSearchParams`
- **AdminRGPDPage** : support `?tab=registre|droits|audit|pages` via `useSearchParams`
- **NotificationSettings** : support `?tab=rules|webhooks` via `useSearchParams`
- **preference/index.ts** : 6 tutoriels corriges avec `navigateTo` incluant `?tab=`
- **rgpd/index.ts** : 4 tutoriels corriges avec `?tab=`, selecteurs simplifies vers elements stables
- **notification/index.ts** : tutoriel `push.subscribe` supprime (push combine avec in-app), webhook tutorials corriges
- **_identity/index.ts** : selecteurs corriges (`roles.update`, `roles.delete` → `.unified-table`, `permissions.manage` → `.toggle-switch`), invitations `navigateTo` avec `?tab=invitations`
- **UsersAdminPage** : nouvel onglet Invitations (table, modale d'invitation par email, suppression) utilisant les endpoints API existants

### Nettoyage code mort

- Suppression `config.template.yaml` et `config.custom.yaml` (jamais lus par le code)
- Suppression `_deep_merge()`, `load_yaml_config()` et `yaml_config` dans `config.py`
- Suppression `_create_gated_router()` dans `feature_registry.py` (remplace par le middleware)
- Nettoyage imports inutilises (`Depends`, `HTTPException`, `status`) dans `feature_registry.py`
- Suppression parametre `dev_mode` de `register_routes()` (toutes les routes enregistrees, le middleware gate)
- Mise a jour `CLAUDE.md` : retrait references a `config.template.yaml`

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

- Endpoint `PATCH /notifications/{id}/unread` : remettre une notification en non lu
- Service `mark_notification_unread()` (inverse de `mark_notification_read`)
- Bouton "Marquer comme non lu" dans le dropdown bell et la page notifications (user + admin)
- Soft delete des notifications (`deleted_at` au lieu de suppression definitive) — filtre `deleted_at IS NULL` sur toutes les requetes utilisateur
- Parametre `include_deleted` sur l'endpoint admin pour afficher les notifications supprimees
- Filtre admin "Voir les supprimees" avec affichage rouge des lignes supprimees
- `markAsUnread()` ajoute au `NotificationContext`
- Script cron `purge_notifications.py` : suppression definitive des notifications soft-deleted apres N jours (configurable via `NOTIFICATION_PURGE_DAYS` dans `.env`, defaut 90 jours)
- Migration Alembic : ajout colonne `deleted_at` sur la table `notifications`
- Seed : notifications de demo pour tous les utilisateurs (read, unread, soft-deleted)

## 2026.02.12

### preference.didacticiel — Refonte du systeme de tutoriels

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

- Nouvelle feature `event` : bus d'evenements generique avec persistence
- Model `Event` (deplace depuis notification) et service `persist_event`
- Event handler wildcard : persiste les events puis re-emet `event.persisted` pour les features downstream
- Declaration des types d'events dans les manifests des features (`FeatureManifest.events`)
- Endpoint `GET /api/events/event-types` pour la decouverte dynamique
- Page admin "Catalogue d'evenements" : liste groupee par feature avec recherche
- Lien "Events" dans le menu admin du Header

### \_identity

- Emission d'evenements via event bus : `user.registered`, `user.invited`, `user.invitation_accepted`, `user.updated`, `user.deactivated`, `admin.impersonation_started`
- Lien "Events" dans le menu admin (conditionne par la feature event)

### notification

- Cablage event bus : ecoute `event.persisted` via `event_handlers.py` pour le moteur de regles (remplace l'ancien dispatch interne)
- Dependance vers la feature `event` (persistence + catalogue)
- Suppression du model `Event` local (deplace vers `event/models.py`)
- Suppression de `dispatch_event`, `EVENT_CATALOG`, `get_event_categories` du services.py
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
- Ajout `mfa_setup_required` et `mfa_grace_period_expires` dans `TokenResponse`
- LoginPage : redirection selon etat grace period (banner ou force-setup)
- ProtectedRoute : blocage navigation si grace period expiree
- MFASetupPage : appel `clearMfaSetupRequired()` apres activation d'une methode

### preference (NEW)

- Feature parent "Preferences" avec sous-features `preference.theme` et `preference.didacticiel`
- Page preferences (`/profile/preferences`) accessible depuis le profil
- `preference.theme` : section theme (dark/light + fond visuel) dans la page preferences
- `preference.didacticiel` : systeme de tutoriels in-app type intro.js (spotlight/tooltip SVG mask)
- Backend : endpoints seen-state (`GET/POST/DELETE /api/preference/didacticiel/seen`) avec stockage dans user.preferences
- Frontend : TutorialContext (collecte tutoriels des manifests, auto-trigger par route, gestion etat "vu")
- Frontend : TutorialEngine (overlay SVG mask, highlight pulse, tooltip positionne)
- Frontend : TutorialSection (liste des tutoriels dans la page preferences, bouton Revoir/Commencer)
- Integration App.tsx : TutorialWrapper conditionnel si feature active
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

- Feature SSO (Single Sign-On) avec OAuth2 : Google et GitHub
- Liaison automatique de comptes, creation d'utilisateur SSO
- Boutons SSO sur la page de connexion, gestion des comptes lies dans le profil

### mfa (NEW)

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

- Auth JWT (access 24h + refresh 7d) avec login local et SSO Intranet
- CRUD utilisateurs avec pagination, tri, recherche, inline-edit en table
- Systeme de roles avec CRUD et assignation de permissions
- Permissions granulaires au format `feature.sub.action`, resolution : user > role > global
- Feature Registry avec toggle dynamique, hierarchie parent/children, validation des dependances
- Page admin Features avec activation/desactivation en temps reel
- Impersonation d'utilisateurs avec audit log complet (actions, IP, user-agent)
- App Settings : nom, logo (upload), couleur, favicon, email support — endpoint public + admin CRUD
- Backups et restauration de base de donnees
- Recherche globale
- Invitations par email avec lien d'acceptation
- Middleware LastActive pour tracking de l'activite utilisateur
- Page profil avec modification info, mot de passe, preferences theme

### notification

- Notifications in-app avec stockage en base et pagination
- SSE (Server-Sent Events) pour reception en temps reel
- Moteur de regles event-driven : regles personnelles et globales (admin)
- Templates de regles : appliques automatiquement a tous les utilisateurs
- Preferences utilisateur par regle (activation, canaux, webhooks)
- Compteur de non-lus avec endpoint dedie
- Marquage lu/non-lu individuel et global
- NotificationBell dynamique : dropdown push si actif, lien settings sinon
- Prompt d'activation push conditionne par le feature flag `notification.push`

### notification.email

- Envoi d'emails via SMTP configurable (host, port, TLS, credentials)
- Support Office365 par defaut
- Configurable via .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_ENABLED)

### notification.push

- Web Push notifications via protocole VAPID (ECDSA P-256)
- Service Worker (`sw.js`) pour reception en arriere-plan
- Gestion des abonnements push par navigateur (subscribe/unsubscribe)
- Endpoint public pour la cle VAPID
- Configurable via .env (VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, PUSH_ENABLED)

### notification.webhook

- Webhooks HTTP POST avec retry automatique (configurable)
- Support multi-format : Custom (JSON brut), Slack, Discord
- Webhooks personnels et globaux (admin)
- Signature HMAC optionnelle pour securisation
- Prefixe de message configurable (ex: @canal pour Slack)
- Endpoint de test pour valider la connectivite
- Historique des deliveries avec status HTTP

### Infrastructure

- Docker 3 services (db:5470, api:5471, app:5472)
- PostgreSQL + SQLAlchemy async (asyncpg)
- Alembic pour les migrations
- Config YAML dual : `config.template.yaml` (template) + `config.custom.yaml` (projet)
- Frontend React 18 + TypeScript + Vite + Bun
- Dark theme et light theme
- CalVer `YYYY.MM.N` pour le versioning
