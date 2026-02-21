# preference.couleur — Changelog

## 2026.02.16

- Creation de la sous-feature `preference.couleur`
- Personnalisation des couleurs de l'application (primary, success, warning, danger, gray scale)
- Variantes separees pour le theme clair et sombre
- Stockage dans `User.preferences.customColors` (pas de nouvelle table)
- Application pre-render dans `main.tsx` pour eviter le flash
- Composant `ColorSection` avec color pickers groupes et reinitialisation
