# CLAUDE.md

## Architecture

Architecture modulaire feature-based avec Feature Registry.

- Features template (core) : `api/src/core/` et `app/src/core/`
- Features projet : `api/src/features/` et `app/src/features/`
- Feature Registry : decouverte automatique des features via `manifest.py`, toggle dynamique (DB + admin UI), hierarchie parent/children, validation des dependances, middleware de gating (404 si feature desactivee)
- Config : `.env` + `Settings` (pydantic) dans `api/src/core/config.py`

## Mode de developpement

MODE: can_both

Valeurs possibles :
- `template` → les nouvelles features vont dans `core/` (api + app), automatiquement
- `project` → les nouvelles features vont dans `features/` (api + app), automatiquement
- `can_both` → Claude demande a chaque creation de feature si c'est template ou projet

Quand tu crees une feature :
1. Lire le MODE ci-dessus
2. Si `can_both`, demander a l'utilisateur : "Template ou Projet ?"
3. Placer les fichiers backend dans `api/src/core/<name>/` ou `api/src/features/<name>/`
4. Placer les fichiers frontend dans `app/src/core/<name>/` ou `app/src/features/<name>/`
5. Les features template ne doivent JAMAIS dependre de features projet

## Stack

### Frontend
- React 18 + TypeScript + Vite
- Runtime & package manager : **Bun** (pas npm, pas yarn)
- Dark theme et light theme obligatoires (toute UI doit supporter les deux)
- Decouverte dynamique des routes via `import.meta.glob`
- **AUCUN style inline dans les TSX** (`style={{}}` interdit) — tous les styles dans des fichiers `.scss` uniquement
  - **Exception unique** : `style={{ '--var-name': dbValue }}` est autorise pour injecter des valeurs dynamiques venant de la base de donnees (ex: couleur de role). Le style visuel reste dans les fichiers SCSS via `var(--var-name)`.

### Backend
- FastAPI + Python 3.11
- SQLAlchemy async (asyncpg)
- Migrations : **Alembic**
- PostgreSQL

### Infra
- Docker : 3 services (db:5470, api:5471, app:5472)
- Hot reload en dev (uvicorn --reload + vite)

## Securite & Autorisation (RBAC)

L'autorisation est **100% role-based**. Le champ `is_super_admin` sur le modele `User` est un **marqueur visuel uniquement** — il ne bypasse aucune permission.

### Modele

| Concept | Table | Description |
|---------|-------|-------------|
| Permission | `permissions` | Code unique (`feature.action`), declaree dans `manifest.py` |
| Role | `roles` | Groupe de permissions (ex: `super_admin`, `admin`, `user`) |
| RolePermission | `role_permissions` | Lien role ↔ permission |
| UserRole | `user_roles` | Lien user ↔ role |
| GlobalPermission | `global_permissions` | Permissions accordees a TOUT user authentifie (lectures de base, MFA, SSO) |

### Roles par defaut

- **`super_admin`** : toutes les permissions (slug configurable via `SUPER_ADMIN_ROLE_SLUG` dans `.env`)
- **`admin`** : permissions de gestion (users, roles, settings, etc.)
- **`user`** : pas de role_permissions directes (tout passe par GlobalPermission)

### Regles

- **Ne JAMAIS checker `user.is_super_admin`** dans le code d'autorisation — utiliser `require_permission()` ou `load_user_permissions()`
- Quand on toggle `is_super_admin` dans l'UI → le role `super_admin` est assigne/retire automatiquement (sync dans `routes_users.py`)
- Un pirate qui flip `is_super_admin=True` en DB sans le role → aucun acces
- `_is_super_admin()` dans `security.py` verifie le **role**, pas le flag

### Nouvelles permissions

Quand tu ajoutes des permissions dans un `manifest.py` :
1. Elles sont auto-sync en DB au demarrage de l'API (`sync_permissions_from_registry`)
2. Le role `super_admin` recoit automatiquement les nouvelles permissions (`on_startup` step 2)
3. Si necessaire, ajouter les permissions au role `admin` ou en GlobalPermission via une migration Alembic

## Bootstrap & Docker

### Demarrage automatique

Le container API utilise `entrypoint.sh` qui execute :
1. `alembic upgrade head` — applique toutes les migrations (schema + data)
2. `uvicorn` — demarre l'API

### Fixtures (migration Alembic one-shot)

Les donnees de base (roles, permissions, global_permissions, feature_states, app_settings) sont inserees via une **migration Alembic data** (`h1i2j3k4l5m6_fixtures_bootstrap.py`). Elle s'execute une seule fois, comme toute migration Alembic.

### Bootstrap au demarrage de l'API (`on_startup`)

A chaque demarrage, 3 etapes idempotentes :
1. **Sync permissions** depuis les manifests des features
2. **Sync role super_admin** : s'assure qu'il a TOUTES les permissions (gere les nouvelles features)
3. **Promotion admin** : si `DEFAULT_ADMIN_EMAIL` existe en DB → set `is_super_admin=True` + assigne le role `super_admin`

### Ajout de fixtures

Pour ajouter des donnees de bootstrap (nouveaux roles, nouvelles global_permissions, etc.) : creer une **nouvelle migration Alembic data** (`op.execute(sa.text(...))`), pas de code dans `on_startup`.

## Tests

Aucun framework de tests configure. Ne pas en ajouter sauf demande explicite.

## Versioning

CalVer : `YYYY.MM.N` (ex: 2026.02.1, 2026.02.2)
- Annee.Mois.Increment — le compteur N reset a 1 a chaque nouveau mois

### Fichiers de version a mettre a jour

A chaque increment de version, mettre a jour **ces 3 fichiers** :

| Fichier | Champ |
|---------|-------|
| `CHANGELOG.md` (racine) | Nouvelle section `## YYYY.MM.N` en haut |
| `app/package.json` | `"version"` |
| `api/src/main.py` | `version=` dans `create_app()` |

**Note** : les manifests (`manifest.py`) ne contiennent plus de champ `version`. Le versioning est centralise.

### Regles de bump

- **1 version = 1 commit/merge sur master** : ne pas incrementer la version en cours de travail. Toutes les modifications faites avant un commit/merge sur master sont groupees sous une seule version. Si l'utilisateur demande plusieurs changements avant de commit, ils partagent la meme version.
- **Version globale** : toujours = la derniere version du CHANGELOG global
- **Quand tu incrementes** : verifie le N actuel dans `CHANGELOG.md` racine, incremente de 1

## Structure d'une feature

### Backend template (`api/src/core/<name>/`)

```
<name>/
  __init__.py
  manifest.py      # Metadata, permissions, routers, middleware, dependances
  models.py        # Modeles SQLAlchemy
  schemas.py       # Schemas Pydantic (request/response)
  routes.py        # Endpoints FastAPI (ou routes_*.py si multiple)
  services.py      # Logique metier (optionnel)
```

### Backend projet (`api/src/features/<name>/`)

Meme structure que ci-dessus.

### Frontend template (`app/src/core/<name>/`)

```
<name>/
  index.ts         # Export manifest + routes
  *.tsx             # Composants React
  *.scss            # Styles (SCSS, jamais de CSS brut)
  i18n/fr.json     # Traductions FR
  i18n/en.json     # Traductions EN (stub)
```

### Frontend projet (`app/src/features/<name>/`)

Meme structure que ci-dessus.

### Manifest backend minimal (feature template)

```python
from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="ma_feature",
    label="Ma Feature",
    description="Description courte",
    permissions=["ma_feature.read", "ma_feature.manage"],
    router_module="src.core.ma_feature.routes",
    router_prefix="/api/ma-feature",
    router_tags=["MaFeature"],
)
```

### Manifest backend minimal (feature projet)

```python
from ...core.feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="ma_feature",
    label="Ma Feature",
    description="Description courte",
    permissions=["ma_feature.read", "ma_feature.manage"],
    router_module="src.features.ma_feature.routes",
    router_prefix="/api/ma-feature",
    router_tags=["MaFeature"],
)
```

### Feature enfant (rattachee a un parent)

```python
manifest = FeatureManifest(
    name="parent.child",
    label="Child Feature",
    parent="parent",
    permissions=["parent.child.read"],
    router_module="src.core.parent.child.routes",  # ou src.features. pour projet
    router_prefix="/api/parent/child",
    router_tags=["ParentChild"],
)
```

## Changelog

Un seul changelog centralise : `CHANGELOG.md` a la racine du projet.

### Regles

- **Format** : nouvelle section `## YYYY.MM.N` en haut du fichier, sous-sections `### feature_name`
- Changement specifique a une feature → ajouter sous `### feature_name` dans la version courante
- Changement transversal (docker, config, infra) → section dediee dans la version courante
- Nouvelle feature → section `### feature_name (NEW)` avec le detail

### Checklist apres chaque modification

1. Incrementer la version N dans `CHANGELOG.md` racine (nouvelle section en haut)
2. Bump `app/package.json` → `"version"`
3. Bump `api/src/main.py` → `version=` dans `create_app()`

## RGPD & Consentement (localStorage/sessionStorage)

L'application applique le consentement RGPD sur le stockage navigateur. **Toute ecriture en localStorage ou sessionStorage doit respecter les categories de consentement.**

### Categories de stockage

| Categorie | Consentement requis | Exemples |
|-----------|-------------------|----------|
| **Necessaire** | Non (toujours autorise) | `access_token`, `refresh_token`, `mfa_*`, `rgpd_consent_given` |
| **Fonctionnel** | Oui (`hasConsent('functional')`) | `preferences_{userId}`, `push_prompt_dismissed`, `tutorial_*`, `mfa_banner_dismissed` |
| **Analytique** | Oui (`hasConsent('analytics')`) | Aucun actuellement |
| **Marketing** | Oui (`hasConsent('marketing')`) | Aucun actuellement |

### Regles pour les developpeurs

1. **Avant d'ecrire en localStorage/sessionStorage** : verifier si la donnee est strictement necessaire au fonctionnement. Si c'est une preference utilisateur ou un etat d'UI, c'est "fonctionnel" → utiliser `hasConsent('functional')` avant d'ecrire.
2. **Utiliser `consentManager.ts`** (`app/src/core/rgpd/consentManager.ts`) :
   - `hasConsent('functional')` : verifie si le consentement fonctionnel est accorde
   - `cleanupFunctionalStorage()` : purge toutes les cles fonctionnelles
3. **Nouvelle cle fonctionnelle** : si tu ajoutes une cle localStorage/sessionStorage fonctionnelle, **ajoute-la aussi dans `cleanupFunctionalStorage()`** dans `consentManager.ts` pour qu'elle soit nettoyee lors de la revocation.
4. **AuthContext** : `getLocalPreferences()` et `setLocalPreferences()` sont deja proteges. Utiliser `getPreference()` / `updatePreference()` pour les preferences utilisateur — le consentement est gere automatiquement.
5. **Les donnees en DB ne sont pas concernees** : le consentement RGPD porte sur le stockage local (terminal de l'utilisateur). Les preferences sont toujours sauvegardees en DB via l'API, et chargees depuis la DB a chaque session. Seul le cache localStorage est conditionne au consentement.
6. **Wording CNIL** : utiliser "cookies et traceurs" (pas juste "cookies") dans toute l'UI liee au consentement.

## Preferences utilisateur & CSS

Les preferences de personnalisation s'appliquent a **l'ensemble de l'interface**. Tout nouveau style ou composant doit respecter les variables CSS de preference.

### Regles obligatoires pour les SCSS

1. **`font-size` en `rem`, jamais en `px`** — L'echelle de texte (`html font-size: X%`) propage via `rem`. Utiliser la table de conversion :
   - 10px=0.625rem, 11px=0.6875rem, 12px=0.75rem, 13px=0.8125rem, 14px=0.875rem, 15px=0.9375rem, 16px=1rem, 18px=1.125rem, 20px=1.25rem, 24px=1.5rem, 28px=1.75rem
2. **`border-radius: var(--radius)`** — Toujours utiliser la variable, jamais un px fixe (sauf cercles `50%`)
3. **Padding des composants interactifs** — Utiliser les variables de densite :
   - Boutons : `padding: var(--density-btn-padding, 8px 16px)`
   - Inputs : `padding: var(--density-input-padding, 8px 12px)`
   - Cellules de table : `padding: var(--density-padding, 12px 20px)`
   - Cards : `padding: var(--density-card-padding, 24px)`
4. **Gaps entre sections** — `gap: var(--section-gap, 24px)` pour les conteneurs de page
5. **Largeur du contenu** — `max-width: var(--content-max-width, 1200px)` pour les conteneurs principaux
6. **`font-family`** — Ne pas definir explicitement sauf pour du code (`monospace`). Le body propage `var(--font-family)` a tous les elements via heritage CSS.
7. **Accessibilite** — Ne pas utiliser `!important` sur `transition`, `outline`, `font-family` car les classes `a11y-*` globales peuvent les surcharger.

### Variables CSS de preference disponibles

| Variable | Defaut | Source |
|----------|--------|--------|
| `--font-family` | system stack | preference.font |
| `--line-height` | 1.5 | preference.font |
| `--font-weight` | 400 | preference.font |
| `--radius` | 8px | preference.layout |
| `--density-padding` | 12px 16px | preference.layout (compact/normal/airy) |
| `--density-gap` | 12px | preference.layout |
| `--density-btn-padding` | 8px 16px | preference.layout |
| `--density-input-padding` | 8px 12px | preference.layout |
| `--density-card-padding` | 24px | preference.layout |
| `--content-max-width` | 1200px | preference.layout |
| `--section-gap` | 24px | preference.layout |

### Pre-render & application

- `main.tsx` IIFE : applique les preferences avant le rendu React (anti-flash)
- `AuthContext.tsx` : re-applique apres login/SSO
- Utilitaire : `app/src/core/preference/applyPreferences.ts`
- Chaque section appelle son `apply*Prefs()` au changement + `updatePreference()` pour persister

## Internationalisation (i18n)

L'application utilise un systeme i18n decentralise : chaque feature gere ses propres traductions.

### Architecture

- **Backend** : feature `i18n` dans `api/src/core/i18n/` — middleware de resolution locale (JWT `lang` > `Accept-Language` > defaut), API publique `/api/i18n/locales` et `/api/i18n/translations`
- **Frontend** : `i18next` + `react-i18next` — auto-decouverte des fichiers JSON via `import.meta.glob` dans `app/src/core/i18n/i18n.ts`
- **Config** : `I18N_DEFAULT_LOCALE=fr`, `I18N_SUPPORTED_LOCALES=fr,en` dans `.env`

### Structure des traductions

```
app/src/core/<feature>/i18n/fr.json          # Traductions FR de la feature
app/src/core/<feature>/i18n/en.json          # Traductions EN (stub vide = fallback FR)
app/src/core/<feature>/<sub>/i18n/fr.json    # Sous-feature
app/src/features/<feature>/i18n/fr.json      # Feature projet
app/src/core/i18n/locales/fr/common.json     # Traductions globales communes
```

Le **namespace** i18next = le nom de la feature (deduit du chemin). Ex : `preference.theme`, `_identity`, `rgpd`, `common`.

### Regles obligatoires

1. **AUCUN texte visible hardcode** dans les `.tsx` — tous les textes passent par `t('cle')` via `useTranslation('namespace')`
2. **Namespace = nom de la feature** : `useTranslation('_identity')`, `useTranslation('preference.theme')`, `useTranslation('common')` pour les composants partages
3. **Constantes avec labels** : utiliser des `labelKey` (cles de traduction) au lieu de textes en dur. Appeler `t(item.labelKey)` au render
4. **Composants hors arbre React** (AuthContext, utilitaires) : utiliser `i18next.t('common:cle')` directement
5. **Interpolation** : `t('message', { name, count })` — les variables sont passees en 2e argument

### Quand tu crees un composant ou une feature

1. Creer `<feature>/i18n/fr.json` avec toutes les chaines visibles (labels, titres, messages, placeholders, boutons)
2. Creer `<feature>/i18n/en.json` avec les memes cles et valeurs vides `""` (stub pour traduction future)
3. Dans le TSX : `import { useTranslation } from 'react-i18next'` + `const { t } = useTranslation('<namespace>')`
4. Remplacer chaque texte visible par `t('cle')`
5. Pour les traductions communes (boutons generiques : "Annuler", "Sauvegarder"...), utiliser le namespace `common` dans `app/src/core/i18n/locales/fr/common.json`

### Backend — locale dans les services

- Les methodes d'envoi d'email acceptent un parametre `locale: str = "fr"`
- Le JWT contient un claim `lang` avec la preference de langue de l'utilisateur
- Le middleware `I18nMiddleware` set `request.state.locale` sur chaque requete

## CI / Linting

La CI est definie dans `.github/workflows/ci.yml` (source unique de verite). Elle est executable en local via `act` (nektos/act) qui lit directement le YAML GitHub Actions.

### Prerequis (une seule fois)

```bash
# Installer act (Windows)
winget install nektos.act
```

La config projet est dans `.actrc` a la racine (image Docker, env file). Rien d'autre a configurer.

### Verification locale obligatoire avant commit

```bash
# CI complete (identique a GitHub Actions)
act push

# Lints seuls (plus rapide, suffisant pour le dev courant)
act -j lint-backend -j lint-frontend

# Alembic check (necessite la DB locale demarree)
docker compose run --rm api alembic check
```

- **Ne jamais commit si les lints echouent**
- Si ruff echoue : corriger les erreurs (ruff --fix gere la plupart), relancer
- Si tsc echoue : corriger les erreurs TypeScript, relancer
- Si alembic check echoue : les modeles SQLAlchemy ne matchent pas la DB, corriger les models.py

### Config ruff

- Fichier : `ruff.toml` a la racine du projet
- Regles actives : `E` (pycodestyle errors), `W` (warnings), `F` (pyflakes), `I` (isort)
- Ignore : `E501` (longueur de ligne, geree par `line-length = 120`), `E712` (`== True/False` requis par SQLAlchemy)
- Tri des imports : `known-first-party = ["src"]`

## Commandes slash

| Commande | Description |
|----------|-------------|
| `/commit` | Procedure complete de commit : lints CI → alembic check → version bump → git add/commit |
| `/issue` | Creer une issue dans `./issues/` : guide la redaction, check les logs Docker, formate le fichier |

**Quand l'utilisateur demande un git add/commit** : toujours executer `/commit` au lieu de faire les etapes manuellement.
**Quand l'utilisateur signale un bug ou veut noter un probleme** : utiliser `/issue` pour creer le fichier formate dans `./issues/`.

## Regles de dev

- Toujours supporter dark + light theme
- Permissions au format `feature.sub.action`
- Les features template ne doivent pas dependre de features projet
- Utiliser **Bun** (pas npm/yarn)
- Ne pas ajouter de tests sauf demande explicite
- Apres chaque modification, mettre a jour le `CHANGELOG.md` racine
- **Toujours utiliser Docker** pour executer des commandes (build, install, run, migrations, etc.). Ne jamais executer directement sur la machine hote. Exception : les commandes `git` et `act` s'executent sur la machine hote.
- **Pour commit** : utiliser la commande `/commit` qui gere les lints, alembic check, version bump et commit
