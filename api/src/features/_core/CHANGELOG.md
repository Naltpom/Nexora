# _core — Changelog

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
