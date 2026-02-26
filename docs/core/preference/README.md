# Feature : `preference` (parent)

## Description

Conteneur parent pour les sous-features de personnalisation utilisateur. Fournit la page de preferences avec navigation par onglets, le systeme de draft/snapshot pour preview en direct, et la modal de changements non sauvegardes.

## Architecture

### Backend (`api/src/core/preference/`)

| Fichier | Role |
|---------|------|
| `manifest.py` | Manifest parent, 1 permission (`preference.read`), 8 enfants |

Le parent n'a pas de routes ni de modeles propres. Les endpoints sont dans les sous-features `didacticiel` et `langue`.

### Frontend (`app/src/core/preference/`)

| Fichier | Role |
|---------|------|
| `index.ts` | Manifest frontend, 2 routes, 2 nav items, tutorial targets |
| `PreferencePage.tsx` | Page principale, tabs, save-bar, navigation blocking |
| `DraftPreferenceContext.tsx` | Draft/snapshot state, visual preview, save/discard |
| `UnsavedChangesModal.tsx` | Modal avec liste des changements (ancien → nouveau) |
| `applyPreferences.ts` | Utilitaires CSS variables (font, layout, composants, a11y) |
| `preference.scss` | Styles inputs/selects dans les sections |
| `preferenceTabs.scss` | Tabs desktop/mobile, save-bar sticky |
| `unsavedChangesModal.scss` | Styles modal |

## Permissions

| Permission | Scope | GlobalPermission |
|-----------|-------|-----------------|
| `preference.read` | Acces a la page preferences | Oui |

Les permissions des onglets sont dans les sous-features respectives (`preference.theme.read`, `preference.font.read`, etc.).

## Routes

| Chemin | Composant | Permission |
|--------|-----------|-----------|
| `/profile/preferences` | `PreferencePage` | `preference.read` (implicite) |
| `/aide` | `AidePage` (lazy, didacticiel) | `preference.didacticiel.read` |

## Sous-features (8)

| Nom | Type | Routes API | Permissions |
|-----|------|-----------|------------|
| `preference.theme` | UI-only | Non | `preference.theme.read` |
| `preference.couleur` | UI-only | Non | `preference.couleur.read` |
| `preference.font` | UI-only | Non | `preference.font.read` |
| `preference.layout` | UI-only | Non | `preference.layout.read` |
| `preference.composants` | UI-only | Non | `preference.composants.read` |
| `preference.accessibilite` | UI-only | Non | `preference.accessibilite.read` |
| `preference.langue` | API | `GET/PUT /api/preferences/language` | `preference.langue.read` |
| `preference.didacticiel` | API | `GET/POST/DELETE /seen`, `GET/PUT /ordering` | `preference.didacticiel.read`, `.manage` |

## Stockage des preferences

- **DB** : colonne `User.preferences` (JSONB) via `_identity` API (`PUT /me/preferences`)
- **Frontend** : `AuthContext.getPreference()` / `updatePreference()` font le CRUD
- **Draft** : `DraftPreferenceContext` maintient un snapshot (DB) et un draft (local), compare avec `JSON.stringify`, applique visuellement en direct

## CSS Variables appliquees

| Variable | Source | Defaut |
|----------|--------|--------|
| `--font-family` | font.family | system stack |
| `html font-size` | font.scale | 100% |
| `--line-height` | font.lineHeight | 1.5 |
| `--font-weight` | font.weight | 400 |
| `--radius` | layout.radius | 8px |
| `--density-padding` | layout.density | 12px 16px |
| `--density-gap` | layout.density | 12px |
| `--density-btn-padding` | layout.density | 8px 16px |
| `--density-input-padding` | layout.density | 8px 12px |
| `--density-card-padding` | layout.density | 24px |
| `--content-max-width` | layout.maxWidth | 1200px |
| `--section-gap` | layout.sectionGap | 24px |
| `data-card-style` | composants.cardStyle | elevated |
| `data-btn-style` | composants.buttonStyle | rounded |
| `data-modal-anim` | composants.modalAnimation | fade |
| Classes `a11y-*` | accessibilite | desactive |

## Bugs corriges (v2026.02.41)

1. **require_permission sur 6 endpoints** — didacticiel (4) + langue (2) : tous proteges par `require_permission()`, alignes avec les permissions declarees dans les manifests
2. **Manifest parent children incomplet** — 4 enfants manquants ajoutes (font, layout, accessibilite, composants)
3. **Gestion d'erreur saveAll()** — try/catch ajoute, snapshot non mis a jour en cas d'echec, message d'erreur affiche dans la save-bar
4. **SCSS density variables** — tous les paddings/margins/gaps hardcodes remplaces par les variables CSS du systeme de preferences
