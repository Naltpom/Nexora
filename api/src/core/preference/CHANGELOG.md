# Preference — Changelog

## 2026.02.12

### preference.didacticiel — Refonte du systeme de tutoriels
- **Types** : remplacement de `TutorialDefinition` par `FeatureTutorial > PermissionTutorial` (hierarchique)
  - `TutorialStep` : ajout de `navigateTo` (navigation multi-page) et `delay`
  - Nouveaux types : `PermissionTutorial`, `FeatureTutorial`, `TutorialOrdering`
- **Backend** :
  - Suivi "vu" par permission (`permissions_seen`) au lieu de par tutorial ID (`tutorials_seen`)
  - Migration lazy des anciennes donnees `tutorials_seen` dans le endpoint `GET /seen`
  - Nouveaux endpoints `GET/PUT /ordering` pour l'ordonnancement admin (stocke dans `AppSetting`)
  - Nouvelle permission `preference.didacticiel.manage` pour l'admin ordering
  - Schemas : `PermissionSeenRequest/Response`, `TutorialOrderingResponse/Update`
- **TutorialContext** : refactoring complet
  - Collecte des `FeatureTutorial` depuis les manifests frontend
  - Filtrage par permissions utilisateur + tri par ordering admin
  - Detection des nouvelles permissions non vues (`pendingNewPermissions`)
  - Persistance de l'etat actif dans sessionStorage (reprise apres refresh)
- **TutorialEngine** : navigation multi-page
  - `navigateTo` sur les steps : navigation automatique + `waitForElement` (MutationObserver + timeout 5s)
  - Etat d'attente avec spinner, fallback si element introuvable
  - Affichage du label du PermissionTutorial courant dans le tooltip
- **TutorialSection** : affichage groupe par feature
  - Sections collapsibles par feature avec badge "Vu"
  - Boutons "Tout lancer" par feature + "Commencer"/"Revoir" par permission
- **TutorialNotification** : toast bas-droite pour nouvelles permissions non vues
- **TutorialAdminSection** : admin drag & drop (HTML5 natif)
  - Reordonnancement des features et des permissions dans chaque feature
  - Sauvegarde vers `PUT /api/preference/didacticiel/ordering`
- **Contenu** : ~18 sous-tutoriels par permission sur 6 features
  - `_identity` : search, users, roles, features, settings, impersonation
  - `notification` : bell, liste, regles, admin
  - `event` : journal des evenements
  - `mfa` : setup + politique admin
  - `preference` : theme
  - `sso` : lien de comptes

## 2026.02.1

- Creation de la feature preference (parent)
- Sous-features : preference.theme, preference.didacticiel
- preference.theme : section theme dark/light + fond visuel dans la page preferences
- preference.didacticiel : systeme de tutoriels in-app avec spotlight/tooltip SVG mask
  - Backend : endpoints `GET/POST/DELETE /api/preference/didacticiel/seen` (stockage dans user.preferences)
  - Frontend : TutorialContext (collecte tutoriels des manifests, auto-trigger par route, gestion etat "vu")
  - Frontend : TutorialEngine (overlay SVG mask, highlight pulse, tooltip positionne)
  - Frontend : TutorialSection (liste des tutoriels dans la page preferences, bouton Revoir/Commencer)
  - Integration App.tsx : TutorialWrapper conditionnel si feature active
  - Exemple de tutoriel ajoute dans notification/index.ts
- Page preferences (`/profile/preferences`) avec sections enfants conditionnelles
- ProfilePage : lien vers preferences si feature active, fallback theme inline sinon
- config.template.yaml : ajout `preference: true`, `preference.theme: true`, `preference.didacticiel: true`
