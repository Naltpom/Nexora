# CLAUDE.md

## Architecture

Architecture modulaire feature-based avec Feature Registry.

- Features template : `api/src/features/` et `app/src/features/`
- Features projet : `api/src/custom_features/` et `app/src/custom_features/`
- Config template : `config.template.yaml` (ecrase a la mise a jour du template)
- Config projet : `config.custom.yaml` (jamais ecrase)
- Feature Registry : decouverte automatique des features via `manifest.py`, toggle dynamique, hierarchie parent/children, validation des dependances

## Mode de developpement

MODE: can_both

Valeurs possibles :
- `template` → les nouvelles features vont dans `features/` (api + app), automatiquement
- `project` → les nouvelles features vont dans `custom_features/` (api + app), automatiquement
- `can_both` → Claude demande a chaque creation de feature si c'est template ou projet

Quand tu crees une feature :
1. Lire le MODE ci-dessus
2. Si `can_both`, demander a l'utilisateur : "Template ou Projet ?"
3. Placer les fichiers backend dans `api/src/features/<name>/` ou `api/src/custom_features/<name>/`
4. Placer les fichiers frontend dans `app/src/features/<name>/` ou `app/src/custom_features/<name>/`
5. Les features template ne doivent JAMAIS dependre de features custom

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
- Applique a : `config.template.yaml`, `app/package.json`, `api/src/main.py`, chaque `manifest.py`

## Structure d'une feature

### Backend (`api/src/features/<name>/` ou `api/src/custom_features/<name>/`)

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

### Frontend (`app/src/features/<name>/` ou `app/src/custom_features/<name>/`)

```
<name>/
  index.ts         # Export manifest + routes
  *.tsx             # Composants React
  *.css             # Styles
```

### Manifest backend minimal

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
    router_module="src.features.parent.child.routes",
    router_prefix="/api/parent/child",
    router_tags=["ParentChild"],
)
```

## Changelogs

- Chaque feature a un `CHANGELOG.md` dans son dossier backend
- Le `CHANGELOG.md` a la racine du projet pointe vers les changelogs de chaque feature avec un resume
- Changement specifique a une feature → modifier le CHANGELOG de la feature + ajouter un resume dans le global
- Changement transversal (docker, config, infra) → changelog global uniquement
- Nouvelle feature → creer son CHANGELOG.md + ajouter une section dans le global

## Regles de dev

- Toujours supporter dark + light theme
- Permissions au format `feature.sub.action`
- Les features template ne doivent pas dependre de features custom
- Utiliser **Bun** (pas npm/yarn)
- Ne pas ajouter de tests sauf demande explicite
- Apres chaque modification, mettre a jour le CHANGELOG concerne
- **Toujours utiliser Docker** pour executer des commandes (build, install, run, migrations, etc.). Ne jamais executer directement sur la machine hote. Exception : les commandes `git` s'executent sur la machine hote.
