# _core — Changelog

## 2026.02.14

- Nouvelles permissions `commands.read` et `commands.manage`
- Nouveau router `routes_commands.py` : endpoints admin pour le Command Registry

## 2026.02.9

- Emission d'evenements via event bus depuis les routes :
  - `user.registered` (register + create_user)
  - `user.invited` (create_invitation)
  - `user.invitation_accepted` (verify_invitation_code)
  - `user.updated` (update_user, update_user_by_uuid)
  - `user.deactivated` (update_user, update_user_by_uuid quand is_active passe a False)
  - `admin.impersonation_started` (start_impersonation)
- Declaration des event types dans `manifest.py` (`events=[]`)

## 2026.02.6

- Ajout `mfa_grace_period_expires` dans `TokenResponse` (schemas.py)
- Calcul de l'expiration grace period dans `authenticate_user()` (services.py)

## 2026.02.5

- Verification d'email a l'inscription (code 6 chiffres, expiration 5 min, cooldown 60s renvoi)
- Nouveaux champs User : `email_verified`, `verification_code_hash`, `verification_code_expires`, `verification_code_sent_at`
- Nouveaux endpoints : `POST /auth/verify-email`, `POST /auth/resend-verification`
- Modification du register : retourne `RegisterResponse` avec `email_verification_required` au lieu de tokens
- Modification du login : si email non verifie, renvoie un code et retourne `email_verification_required=True`
- Frontend : nouvelle page `VerifyEmailPage` avec saisie code, renvoi, et auto-login apres verification
- Si `EMAIL_ENABLED=False`, la verification est skippee et les tokens sont retournes directement
- Migration Alembic : `586c7bdd872d_add_email_verification_to_users`

## 2026.02.4

- Ajout colonne UUID sur le modele User (migration Alembic)
- Page detail utilisateur `/admin/users/:uuid` : edition profil, gestion roles, permissions resolues avec hierarchie visuelle (User > Role > Global)
- Nouveaux endpoints API : `GET/PUT /users/by-uuid/{uuid}`, `PUT /users/by-uuid/{uuid}/roles`, `POST/DELETE /users/by-uuid/{uuid}/permissions/override`
- Nouveaux schemas : `UserDetailResponse`, `ResolvedPermission`, `RoleBasic`, `UserRolesUpdateRequest`, `UserPermissionOverrideRequest`
- Liste utilisateurs : bouton detail avec navigation vers la page UUID
- Cascade desactivation des features enfants/dependants lors de la desactivation d'un parent
- Fix : MFA non verifie si la feature est desactivee
- Fix : filtrage des methodes MFA par sous-features actives (`mfa.totp`, `mfa.email`)

## 2026.02.3

- Refonte page admin Features : remplacement du layout en cartes par un tableau compact avec toggles
- Refonte page admin Roles : remplacement de la modale de permissions par un panneau lateral split-panel avec pagination API, recherche, et sauvegarde en temps reel
- Ajout endpoints API : `GET /roles/{id}/permissions/all` (permissions paginées avec statut granted) et `POST /roles/{id}/permissions/toggle` (toggle individuel)
- Ajout schemas : `PermissionWithGranted`, `PermissionWithGrantedPaginated`, `TogglePermissionRequest`

## 2026.02.2

- Fix : bcrypt + passlib 1.7.4 compatibilite (monkey-patch `bcrypt.__about__` pour bcrypt >= 4.x)
- Fix : CORS origins corriges pour correspondre au port Docker app (5472)

## 2026.02.1 — Init

- Auth JWT (access 24h + refresh 7d) avec login local et SSO Kertios Intranet
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
