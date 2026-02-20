# CLAUDE.md

## Architecture

Architecture modulaire feature-based avec Feature Registry.

- Features template (core) : `api/src/core/` et `app/src/core/`
- Features projet : `api/src/features/` et `app/src/features/`
- Config template : `config.template.yaml` (ecrase a la mise a jour du template)
- Config projet : `config.custom.yaml` (jamais ecrase)
- Feature Registry : decouverte automatique des features via `manifest.py`, toggle dynamique, hierarchie parent/children, validation des dependances

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

### Backend
- FastAPI + Python 3.11
- SQLAlchemy async (asyncpg)
- Migrations : **Alembic**
- PostgreSQL

### Infra
- Docker : 3 services (db:5470, api:5471, app:5472)
- Hot reload en dev (uvicorn --reload + vite)

## Tests

Aucun framework de tests configure. Ne pas en ajouter sauf demande explicite.

## Versioning

CalVer : `YYYY.MM.N` (ex: 2026.02.1, 2026.02.2)
- Annee.Mois.Increment — le compteur N reset a 1 a chaque nouveau mois

### Fichiers de version a mettre a jour

A chaque increment de version, mettre a jour **tous** ces fichiers :

| Fichier | Champ | Scope |
|---------|-------|-------|
| `config.template.yaml` | `app.version` | Version globale du template |
| `app/package.json` | `"version"` | Version globale frontend |
| `api/src/main.py` | `version=` dans `create_app()` | Version globale API |
| `api/src/core/<name>/manifest.py` | `version=` | Version de chaque feature template modifiee |
| `api/src/features/<name>/manifest.py` | `version=` | Version de chaque feature projet modifiee |

### Regles de bump

- **Version globale** : toujours = la derniere version du CHANGELOG global
- **Version manifest** : = la derniere version ou la feature a ete modifiee (pas forcement la globale)
- Les sous-features (`parent.child`) ont leur propre version dans leur `manifest.py`
- **Quand tu incrementes** : verifie le N actuel dans `CHANGELOG.md` racine, incremente de 1
- **Ne jamais oublier** de bump les 3 fichiers globaux + les manifests des features touchees

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
  CHANGELOG.md     # Historique des changements de la feature
```

### Backend projet (`api/src/features/<name>/`)

Meme structure que ci-dessus.

### Frontend template (`app/src/core/<name>/`)

```
<name>/
  index.ts         # Export manifest + routes
  *.tsx             # Composants React
  *.css             # Styles
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
    version="2026.02.1",
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
    version="2026.02.1",
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
    version="2026.02.1",
    permissions=["parent.child.read"],
    router_module="src.core.parent.child.routes",  # ou src.features. pour projet
    router_prefix="/api/parent/child",
    router_tags=["ParentChild"],
)
```

## Changelogs

### Fichiers changelog

| Fichier | Quand le modifier |
|---------|------------------|
| `CHANGELOG.md` (racine) | **Toujours** — resume de chaque changement, groupe par version |
| `api/src/core/<name>/CHANGELOG.md` | Quand une feature template est modifiee |
| `api/src/features/<name>/CHANGELOG.md` | Quand une feature projet est modifiee |

### Regles

- Chaque feature a un `CHANGELOG.md` dans son dossier backend
- Le `CHANGELOG.md` racine pointe vers les changelogs de chaque feature avec un resume
- Changement specifique a une feature → modifier le CHANGELOG de la feature **ET** ajouter un resume dans le global
- Changement transversal (docker, config, infra) → changelog global uniquement
- Nouvelle feature → creer son CHANGELOG.md + ajouter une section dans le global
- **Format** : nouvelle section `## YYYY.MM.N` en haut du fichier, sous-sections `### feature_name`

### Checklist apres chaque modification

1. Incrementer la version N dans `CHANGELOG.md` racine (nouvelle section en haut)
2. Mettre a jour le `CHANGELOG.md` de chaque feature touchee
3. Bump `config.template.yaml` → `app.version`
4. Bump `app/package.json` → `"version"`
5. Bump `api/src/main.py` → `version=` dans `create_app()`
6. Bump `manifest.py` de chaque feature modifiee → `version=`

## Regles de dev

- Toujours supporter dark + light theme
- Permissions au format `feature.sub.action`
- Les features template ne doivent pas dependre de features projet
- Utiliser **Bun** (pas npm/yarn)
- Ne pas ajouter de tests sauf demande explicite
- Apres chaque modification, mettre a jour le CHANGELOG concerne
- **Toujours utiliser Docker** pour executer des commandes (build, install, run, migrations, etc.). Ne jamais executer directement sur la machine hote. Exception : les commandes `git` s'executent sur la machine hote.
