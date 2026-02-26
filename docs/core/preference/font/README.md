# preference.font — Typographie

## Vue d'ensemble

Feature enfant de `preference`. Permet la personnalisation de la typographie : famille de police, echelle de texte, interligne et epaisseur.

## Perimetre

| Propriete | Type | Plage | Defaut | Variable CSS |
|-----------|------|-------|--------|--------------|
| Famille de police | select (6 options) | system, Inter, Roboto, Open Sans, Atkinson, OpenDyslexic | system | `--font-family` |
| Echelle de texte | slider | 85% - 125% (step 5) | 100% | `html { font-size: X% }` |
| Interligne | slider | 1.2 - 2.0 (step 0.1) | 1.5 | `--line-height` |
| Epaisseur | select (3 options) | 300, 400, 500 | 400 | `--font-weight` |

## Architecture

### Backend (declaration-only)

- **Manifest** : `api/src/core/preference/font/manifest.py`
  - Permission : `preference.font.read`
  - Pas de routes, pas de modeles, pas de schemas
- **Stockage** : JSONB `user.preferences.font` via endpoints generiques `GET/PUT /api/me/preferences` (dans `routes_auth.py`)
- **Event** : `preference.updated` emis au save (declare dans le manifest parent)

### Frontend

| Fichier | Role |
|---------|------|
| `app/src/core/preference/font/FontSection.tsx` | Composant principal (select, sliders, preview, reset) |
| `app/src/core/preference/font/font.scss` | Styles BEM + dark theme |
| `app/src/core/preference/font/i18n/fr.json` | 19 cles de traduction FR |
| `app/src/core/preference/font/i18n/en.json` | 19 cles EN |
| `app/src/core/preference/applyPreferences.ts` | `applyFontPrefs()` — applique les CSS vars |

### Chargement des polices

Toutes les polices sont bundlees localement dans `app/public/fonts/` (aucune dependance CDN externe).
Les `@font-face` sont declares dans `app/src/core/styles/components/_fonts.scss`.

| Police | Dossier | Poids | Taille |
|--------|---------|-------|--------|
| System | (stack natif OS) | tous | 0 |
| Inter | `public/fonts/inter/` | 300, 400, 500, 600, 700 | ~120 KB |
| Roboto | `public/fonts/roboto/` | 300, 400, 500, 700 | ~100 KB |
| Open Sans | `public/fonts/open-sans/` | 300, 400, 500, 600, 700 | ~100 KB |
| Atkinson Hyperlegible | `public/fonts/atkinson-hyperlegible/` | 400, 700 | ~40 KB |
| OpenDyslexic | `public/fonts/opendyslexic/` | 400, 700 | ~235 KB |

### Flux de donnees

```
FontSection (UI)
  → setDraftPreference('font', {...})
  → applyVisual → applyFontPrefs() → CSS vars sur <html>
  → [User Save]
  → saveAll() → PUT /api/me/preferences {"font": {...}}
  → event_bus.emit("preference.updated", keys=["font"])
  → DB: user.preferences JSONB
```

## Permissions

| Permission | Scope | Usage |
|------------|-------|-------|
| `preference.font.read` | GlobalPermission (tous users auth) | Visibilite onglet + tutorial |
| `preference.read` | GlobalPermission (tous users auth) | Endpoints API GET/PUT preferences |

## Integration

- **DraftPreferenceContext** : preview live, save/discard, detection de changements
- **PreferencePage** : onglet `font` filtre par `isActive('preference.font') && can('preference.font.read')`
- **main.tsx IIFE** : pre-render `applyFontPrefs()` anti-FOUC
- **preference.accessibilite** : le mode dyslexie applique aussi `--font-family: "OpenDyslexic"` via classe CSS

## Revue (v2026.02.43)

### Bugs corriges

1. **MEDIUM — Polices bundlees localement** : toutes les polices (Inter, Roboto, Open Sans, Atkinson, OpenDyslexic) etaient chargees via Google Fonts CDN — sauf OpenDyslexic qui n'y existe pas. Fix : bundle local de toutes les polices en woff2 (`public/fonts/`), `@font-face` dans `_fonts.scss`, suppression du CDN Google Fonts de `index.html`.
2. **LOW — `applyFontPrefs(null)` redondant** : appel superflu dans `handleReset()`, deja gere par `setDraftPreference` + `useEffect`. Supprime.

### Conformite SCSS

Toutes les regles respectees : font-size en rem, var(--radius), density vars, dark theme, pas de style inline, pas de font-family hardcode, pas de `!important` sur transition/outline/font-family.
