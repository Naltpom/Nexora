# Feature : `_identity`

> Authentication, users, roles, permissions, feature management, settings, invitations, impersonation, backups, commands.

| Champ | Valeur |
|-------|--------|
| **Type** | Parent (core) |
| **is_core** | `True` |
| **Dependances** | Aucune |
| **API** | `api/src/core/_identity/` |
| **APP** | `app/src/core/_identity/` |
| **Permissions** | 28 |
| **Routers** | 12 |

---

## Table des matieres

1. [Permissions](#permissions)
2. [Modeles de donnees](#modeles-de-donnees)
3. [Endpoints API](#endpoints-api)
4. [Pages frontend](#pages-frontend)
5. [Flux metier](#flux-metier)
6. [Commandes de maintenance](#commandes-de-maintenance)
7. [Events emis](#events-emis)
8. [Middleware](#middleware)
9. [Interactions avec d'autres features](#interactions-avec-dautres-features)
10. [i18n](#i18n)
11. [Variables d'environnement](#variables-denvironnement)

---

## Permissions

| Code | Categorie | Description |
|------|-----------|-------------|
| `users.read` | Users | Lister et voir les utilisateurs |
| `users.create` | Users | Creer un compte utilisateur |
| `users.update` | Users | Modifier profil et statut |
| `users.delete` | Users | Supprimer (soft-delete) un utilisateur |
| `roles.read` | Roles | Lister et voir les roles |
| `roles.create` | Roles | Creer un role |
| `roles.update` | Roles | Modifier un role et ses permissions |
| `roles.delete` | Roles | Supprimer un role (hors roles proteges) |
| `roles.assign_super_admin` | Roles | Attribuer/retirer le role super_admin |
| `permissions.read` | Permissions | Voir les permissions et leurs affectations |
| `permissions.manage` | Permissions | Modifier les permissions globales et overrides |
| `features.read` | Features | Voir le registre de features |
| `features.manage` | Features | Activer/desactiver des features |
| `settings.read` | Settings | Voir les parametres applicatifs |
| `settings.manage` | Settings | Modifier les parametres applicatifs |
| `invitations.create` | Invitations | Envoyer une invitation |
| `invitations.read` | Invitations | Lister les invitations en attente |
| `invitations.delete` | Invitations | Annuler une invitation |
| `impersonation.start` | Impersonation | Demarrer une session d'impersonation |
| `impersonation.read` | Impersonation | Voir les sessions et logs d'impersonation |
| `impersonation.immune` | Impersonation | Immunite (ne peut pas etre impersone) |
| `backups.create` | Backups | Creer un backup de la base |
| `backups.restore` | Backups | Restaurer un backup |
| `backups.read` | Backups | Lister les fichiers de backup |
| `search.global` | Search | Recherche globale d'utilisateurs |
| `commands.read` | Commands | Voir le registre et l'historique des commandes |
| `commands.manage` | Commands | Activer/desactiver des commandes |

---

## Modeles de donnees

### User (`users`)

| Champ | Type | Description |
|-------|------|-------------|
| id | int PK | |
| uuid | UUID unique | Identifiant public |
| email | str unique | |
| password_hash | str nullable | Null pour les utilisateurs SSO |
| first_name, last_name | str | |
| auth_source | str | `"local"`, `"intranet"`, `"sso"` |
| is_active | bool | Defaut `True` |
| email_verified | bool | `False` apres inscription |
| must_change_password | bool | Force le changement au login |
| preferences | JSONB | Preferences utilisateur |
| language | str | Defaut `"fr"` |
| last_login | datetime | Mis a jour a chaque login |
| last_active | datetime | Mis a jour par middleware |
| deleted_at | datetime nullable | Soft-delete (fenetre 30 jours) |
| created_at, updated_at | datetime | |

**Comportements cles :**
- **Soft-delete** : `deleted_at` est set, `is_active` passe a `False`. L'utilisateur peut se reconnecter sous 30 jours pour reactiver.
- **Hard-delete** : Apres 30 jours, commande planifiee purge le compte (email anonymise).
- **SSO** : `password_hash` peut etre `null` ; l'auth est geree par intranet ou SSO externe.

### Role (`roles`)

| Champ | Type | Description |
|-------|------|-------------|
| id | int PK | |
| slug | str unique | Identifiant technique (ex: `super_admin`) |
| name | str | Nom d'affichage |
| description | str nullable | |
| color | str nullable | Couleur hex (ex: `#FF5733`) |
| created_at, updated_at | datetime | |

Roles proteges (non-supprimables) : `super_admin`, `admin`, `user`.

### Permission (`permissions`)

| Champ | Type | Description |
|-------|------|-------------|
| id | int PK | |
| code | str unique | Format `feature.action` |
| feature | str | Nom de la feature |
| label, description | str nullable | |

Auto-sync au demarrage depuis les manifests.

### Tables de liaison

| Table | Cles | Description |
|-------|------|-------------|
| `role_permissions` | role_id + permission_id | Role ↔ Permission |
| `user_roles` | user_id + role_id | User ↔ Role |
| `user_permissions` | user_id + permission_id + `granted` (bool) | Override par utilisateur |
| `global_permissions` | permission_id + `granted` (bool) | Permissions pour tous les users authentifies |

### SecurityToken (`security_tokens`)

Tokens a usage unique (reset password, verification email, verification invitation).

- Hash HMAC-SHA256, expiration configurable, invalidation automatique des anciens tokens du meme type.

### Invitation (`invitations`)

| Champ | Type | Description |
|-------|------|-------------|
| id | int PK | |
| invited_by_id | FK users | Admin qui a invite |
| email | str | Email de l'invite |
| token_hash | str | Token hache |
| user_id | FK users nullable | Lie au compte cree |
| expires_at | datetime | Defaut +48h |
| consumed_at | datetime nullable | Null = en attente |

### ImpersonationLog (`impersonation_logs`)

Session d'impersonation : admin_user_id, target_user_id, session_id, dates, IP, user_agent, actions_count.

### ImpersonationAction (`impersonation_actions`)

Chaque appel API pendant l'impersonation : session_id, endpoint, method, request_data.

### UserSession (`user_sessions`)

Tracking des refresh tokens : hash, IP, user_agent, is_revoked, expires_at.
**Detection de reutilisation** : si un token revoque est utilise, TOUTES les sessions du user sont revoquees.

### FeatureState (`feature_states`)

Etat de toggle par feature (nom, is_active, updated_by).

### CommandState / CommandExecution

Etat d'activation des commandes + journal d'execution (nom, statut, duree, resultat, executeur).

### AppSetting (`app_settings`)

Parametres cle/valeur (app_name, primary_color, app_logo, etc.).

---

## Endpoints API

### Auth (`/api/auth`)

| Methode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/login` | Non | Login (local, intranet SSO, verification email) |
| POST | `/refresh` | Non | Refresh token (detection reutilisation) |
| GET | `/me` | Oui | Profil utilisateur courant |
| GET | `/me/permissions` | Oui | Permissions effectives |
| PUT | `/me` | Oui | Modifier son profil |
| GET | `/me/preferences` | Oui | Preferences utilisateur |
| PUT | `/me/preferences` | Oui | Merge preferences |
| POST | `/change-password` | Oui | Changer son mot de passe |
| POST | `/forgot-password` | Non (rate-limited) | Demander un reset |
| POST | `/reset-password` | Non (rate-limited) | Reset avec token |
| POST | `/verify-reset-token` | Non | Valider un token de reset |
| POST | `/register` | Non (rate-limited) | Inscription |
| POST | `/verify-email` | Non (rate-limited) | Verifier email avec code 6 chiffres |
| POST | `/resend-verification` | Non (cooldown 60s) | Renvoyer le code |
| GET | `/me/sessions` | Oui | Sessions actives |
| DELETE | `/me/sessions/{id}` | Oui | Revoquer une session |
| DELETE | `/me/sessions` | Oui | Revoquer toutes les sessions |
| DELETE | `/me/account` | Oui | Soft-delete de son compte |

### Users (`/api/users`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| GET | `/` | `users.read` | Liste paginee (search, sort, filtre par role) |
| POST | `/` | `users.create` | Creer un utilisateur |
| PUT | `/{user_id}` | `users.update` | Modifier un utilisateur |
| DELETE | `/{user_id}` | `users.delete` | Soft-delete |
| POST | `/{user_id}/reset-password` | `users.update` | Envoyer email de reset |
| GET | `/by-uuid/{uuid}` | `users.read` | Detail utilisateur (roles + permissions resolues) |
| PUT | `/by-uuid/{uuid}` | `users.update` | Modifier par UUID |
| PUT | `/by-uuid/{uuid}/roles` | `users.update` | Remplacer les roles |
| POST | `/by-uuid/{uuid}/permissions/override` | `users.update` | Ajouter un override de permission |
| DELETE | `/by-uuid/{uuid}/permissions/override/{perm_id}` | `users.update` | Supprimer un override |

### Roles (`/api/roles`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| GET | `/` | `roles.read` | Lister les roles |
| POST | `/` | `roles.create` | Creer un role |
| PUT | `/{role_id}` | `roles.update` | Modifier un role |
| DELETE | `/{role_id}` | `roles.delete` | Supprimer (hors proteges) |
| POST | `/{role_id}/permissions` | `roles.update` | Remplacer les permissions du role |
| GET | `/{role_id}/permissions/all` | `roles.read` | Permissions avec statut granted (pagine) |
| POST | `/{role_id}/permissions/toggle` | `roles.update` | Toggle une permission |
| GET | `/{role_id}/users` | `roles.read` | Utilisateurs ayant ce role |

### Permissions (`/api/permissions`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| GET | `/` | `permissions.read` | Toutes les permissions (filtre par feature) |
| GET | `/global` | `permissions.manage` | Permissions globales |
| POST | `/global` | `permissions.manage` | Ajouter/modifier une permission globale |
| DELETE | `/global/{perm_id}` | `permissions.manage` | Retirer une permission globale |

### Impersonation (`/api/impersonation`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| POST | `/start/{target_user_id}` | `impersonation.start` | Demarrer l'impersonation |
| POST | `/stop` | Auth | Arreter et revenir a l'admin |
| POST | `/switch/{target_user_id}` | Auth | Changer de cible |
| GET | `/status` | Auth | Statut de la session |
| GET | `/search-users` | `impersonation.read` | Rechercher des utilisateurs a impersoner |

### Invitations (`/api`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| POST | `/invite` | `invitations.create` | Envoyer une invitation |
| GET | `/invitations` | `invitations.read` | Lister les invitations en attente |
| DELETE | `/invitations/{id}` | `invitations.delete` | Annuler une invitation |
| GET | `/invitations/{token}` | Public | Valider un token d'invitation |
| POST | `/invitations/{token}/accept` | Public | Accepter (creer ou lier le compte) |
| POST | `/invitations/{token}/send-code` | Public | Renvoyer le code de verification |
| POST | `/invitations/{token}/verify` | Public | Verifier le code et activer |

### Features (`/api/features`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| GET | `/` | `features.read` | Lister toutes les features |
| GET | `/manifest` | Public | Manifest frontend (features actives) |
| PUT | `/{name}/toggle` | `features.manage` | Activer/desactiver (cascade enfants) |

### Settings (`/api/settings`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| GET | `/public` | Public | Parametres publics (branding) |
| GET | `/` | `settings.read` | Tous les parametres |
| PUT | `/` | `settings.manage` | Mise a jour en masse |

### Backups (`/api/backups`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| GET | `/` | `backups.read` | Lister backups et demos |
| POST | `/` | `backups.create` | Creer un backup (pg_dump) |
| POST | `/restore` | `backups.restore` | Lancer une restauration async |
| GET | `/jobs/{job_id}` | `backups.read` | Polling du statut de restauration |
| POST | `/copy-to-demo` | `backups.create` | Copier en demo |
| POST | `/copy-to-initial` | `backups.create` | Definir comme backup initial |

### Commands (`/api/commands`)

| Methode | Endpoint | Permission | Description |
|---------|----------|-----------|-------------|
| GET | `/` | `commands.read` | Lister les commandes disponibles |
| GET | `/history` | `commands.read` | Historique d'execution (pagine, filtre) |

### Health (`/api`)

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Health check (`{"status": "ok"}`) |

---

## Pages frontend

| Page | Route | Auth | Permission | Description |
|------|-------|------|-----------|-------------|
| Login | `/login` | Non | — | Formulaire email/mdp, SSO, redirections |
| Register | `/register` | Non | — | Inscription (email, nom, mdp) |
| Forgot Password | `/forgot-password` | Non | — | Demande de reset par email |
| Reset Password | `/reset-password` | Non | — | Formulaire nouveau mdp avec token |
| Verify Email | `/verify-email` | Non | — | Code 6 chiffres, cooldown 60s |
| Force Change Password | `/change-password` | Oui | — | Changement obligatoire |
| Accept Invitation | `/accept-invitation/:token` | Non | — | Flux multi-etapes invitation |
| Home | `/` | Oui | — | Dashboard, stats, acces rapides |
| Profile | `/profile` | Oui | — | Infos perso, mdp, MFA, SSO, prefs |
| Users Admin | `/admin/users` | Oui | `users.read` | Table utilisateurs + onglet invitations |
| User Detail | `/admin/users/:uuid` | Oui | `users.read` | Infos, roles, permissions resolues |
| Roles Admin | `/admin/roles` | Oui | `roles.read` | CRUD roles, gestion permissions |
| Permissions Admin | `/admin/permissions` | Oui | `permissions.read` | Vue permissions, gestion globales |
| Features Admin | `/admin/features` | Oui | `features.read` | Toggle features, hierarchie |
| App Settings | `/admin/settings` | Oui | `settings.read` | Branding, logo, couleurs |
| Database Admin | `/admin/database` | Oui | `backups.read` | Backup/restore avec polling |
| Commands Admin | `/admin/commands` | Oui | `commands.read` | Liste, toggle, execution |
| Command History | `/admin/commands/history` | Oui | `commands.read` | Journal d'execution avec filtres |

### Navigation (menu)

| Section | Label | Route | Icone | Permission | Ordre |
|---------|-------|-------|-------|-----------|-------|
| user | Mon profil | /profile | user | — | 10 |
| admin > gestion | Utilisateurs | /admin/users | users | users.read | 10 |
| admin > gestion | Roles | /admin/roles | shield | roles.read | 20 |
| admin > gestion | Permissions | /admin/permissions | lock | permissions.read | 30 |
| admin > systeme | Features | /admin/features | grid | features.read | 10 |
| admin > systeme | Parametres | /admin/settings | sliders | settings.read | 20 |
| admin > systeme | Base de donnees | /admin/database | database | backups.read | 30 |
| admin > systeme | Commandes | /admin/commands | terminal | commands.read | 40 |

---

## Flux metier

### Authentification (login)

```
POST /login (email, password)
├─ Rate limit (par email + IP)
├─ Si email matche le domaine intranet :
│  └─ Tenter SSO intranet
│     ├─ Succes : auto-creation user si nouveau, continuer
│     └─ Echec : fallback vers auth locale
├─ Auth locale :
│  └─ Recherche user par email
│     ├─ Actif : continuer
│     ├─ Soft-delete < 30j : reactiver si mdp correct
│     └─ Mdp incorrect ou absent (SSO) : 401
├─ Verification email :
│  └─ Si non verifie : envoyer code, retour anticipé
├─ Check MFA (si feature mfa active) :
│  └─ Si requis : retourner MFA token + methodes
├─ Mise a jour last_login
└─ Retourner access_token + refresh_token
```

### Resolution des permissions

Ordre de priorite :
1. **Override utilisateur** (`user_permissions`) — grant ou deny explicite
2. **Role** (`role_permissions`) — si le user a un role avec cette permission
3. **Global** (`global_permissions`) — accordee a tous les users authentifies
4. **Defaut** : refuse

### Impersonation

```
POST /impersonation/start/{target_user_id}
├─ Verifications : pas soi-meme, cible active, cible non immune
├─ Creation ImpersonationLog (session_id, admin, target, IP)
├─ Emission event admin.impersonation_started
├─ Token JWT avec claims impersonated_by + impersonation_session_id
└─ Retour access_token + refresh_token + session_id

Pendant l'impersonation :
├─ Middleware audit enregistre chaque appel API
└─ Permissions verifiees en tant que l'utilisateur cible

POST /impersonation/stop
├─ Cloture de la session (ended_at)
└─ Retour des tokens de l'admin original
```

### Invitation

```
1. Admin : POST /invite → creation Invitation (token, expiry 48h) → email
2. Invite : GET /invitations/{token} → validation, infos
3. Invite : POST /invitations/{token}/accept
   ├─ Compte existant : verification mot de passe
   └─ Nouveau : creation compte (is_active=False)
   → Envoi code 6 chiffres
4. Invite : POST /invitations/{token}/verify
   → Activation compte, invitation consommee, retour tokens
```

### Soft-delete de compte

```
DELETE /me/account
├─ deleted_at = now, is_active = False
├─ Email anonymise ("deleted_{id}_{email}")
├─ Sessions revoquees
└─ Reactiver possible en se reconnectant sous 30 jours

Apres 30 jours : commande _identity.purge_soft_deleted_users → hard-delete
```

### Detection de reutilisation de refresh token

Si un token revoque est utilise → toutes les sessions du user sont revoquees (mesure de securite).

---

## Commandes de maintenance

| Commande | Description | Schedule |
|----------|-------------|----------|
| `_identity.purge_expired_tokens` | Purge tokens consommes et expires | Quotidien 00:00 UTC |
| `_identity.purge_impersonation_logs` | Purge logs > retention_days | Configurable |
| `_identity.backup_database` | pg_dump + nettoyage > 7 jours | Configurable |
| `_identity.purge_command_logs` | Purge logs commandes > retention_days | Configurable |
| `_identity.purge_expired_sessions` | Purge sessions revoquees/expirees | Configurable |
| `_identity.purge_soft_deleted_users` | Hard-delete users soft-deleted > 30j | Configurable |

---

## Events emis

| Event | Declencheur | Payload |
|-------|------------|---------|
| `user.registered` | Inscription | email, first_name, last_name |
| `user.invited` | Admin invite | invited_by_name, invited_email |
| `user.invitation_accepted` | Acceptation invitation | user_name, email |
| `user.updated` | Modification profil | email, actor_name |
| `user.deactivated` | Desactivation par admin | email, target_name |
| `admin.impersonation_started` | Debut impersonation | target_name, target_email, session_id, admin_name |

---

## Middleware

### ImpersonationAuditMiddleware

Intercepte chaque requete. Si le JWT contient `impersonation_session_id`, enregistre l'action dans `impersonation_actions` et incremente le compteur de la session. Non-bloquant (erreurs silencieuses).

### LastActiveMiddleware

Met a jour `User.last_active` sur les requetes authentifiees reussies (status < 400). Ignore les refresh tokens et les sessions d'impersonation.

---

## Interactions avec d'autres features

| Feature | Interaction |
|---------|-------------|
| **mfa** | Login verifie si MFA requis, retourne MFA token/methodes si oui |
| **notification.email** | Utilise pour resets password, verification email, invitations |
| **rgpd** | Endpoint `/me` verifie les acceptations legales en attente |
| **event** | Publie des events user/admin sur le bus d'events |
| **sso** | Login page affiche les boutons SSO (lazy-loaded) ; SSO callback cree/lie des comptes |
| **preference** | Profile page affiche le lien vers les preferences si la feature est active |
| **feature_registry** | Lit/ecrit les toggles, sync les permissions des manifests |

---

## i18n

Namespace : `_identity`

Fichiers :
- `app/src/core/_identity/i18n/fr.json` — traductions completes (~579 cles)
- `app/src/core/_identity/i18n/en.json` — traductions anglaises

Sections principales : `login`, `register`, `forgot_password`, `reset_password`, `verify_email`, `accept_invitation`, `home`, `profile`, `users_admin`, `user_detail`, `roles_admin`, `permissions_admin`, `features_admin`, `app_settings`, `database_admin`, `commands_admin`, `command_history`.

---

## Variables d'environnement

| Variable | Description | Defaut |
|----------|-------------|--------|
| `SUPER_ADMIN_ROLE_SLUG` | Slug du role super admin | `super_admin` |
| `DEFAULT_ADMIN_EMAIL` | Email de l'admin bootstrap au demarrage | — |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Duree de vie refresh token | 30 |
| `IMPERSONATION_LOG_RETENTION_DAYS` | Retention des logs d'impersonation | 90 |
| `SESSION_RETENTION_DAYS` | Retention des sessions | 90 |
| `COMMAND_LOG_RETENTION_DAYS` | Retention des logs de commandes | 30 |
| `INTRANET_EMAIL_DOMAIN` | Domaine pour SSO intranet | — |
| `INTRANET_AUTH_URL` | URL du endpoint SSO intranet | — |
| `BACKUP_DIR` | Repertoire de stockage des backups | — |
| `EMAIL_ENABLED` | Activer l'envoi d'emails | — |
