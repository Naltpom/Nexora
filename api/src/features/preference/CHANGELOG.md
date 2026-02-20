# Preference — Changelog

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
