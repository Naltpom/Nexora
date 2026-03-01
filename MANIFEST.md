# Guide de creation d'une feature core

Ce document est un didacticiel complet pour creer une nouvelle feature dans `core/`.
Chaque section est une etape obligatoire — aucune ne doit etre ignoree.

---

## Table des matieres

1. [Structure des fichiers](#1-structure-des-fichiers)
2. [Manifest backend](#2-manifest-backend)
3. [Modeles SQLAlchemy](#3-modeles-sqlalchemy)
4. [Schemas Pydantic](#4-schemas-pydantic)
5. [Routes FastAPI](#5-routes-fastapi)
6. [Services](#6-services-optionnel)
7. [Manifest frontend](#7-manifest-frontend)
8. [Composants React](#8-composants-react)
9. [SCSS — regles obligatoires](#9-scss--regles-obligatoires)
10. [Internationalisation (i18n)](#10-internationalisation-i18n)
11. [Permissions](#11-permissions)
12. [Events](#12-events)
13. [Tutorials](#13-tutorials)
14. [Feature enfant (parent/child)](#14-feature-enfant-parentchild)
15. [Migration Alembic](#15-migration-alembic)
16. [Checklist finale](#16-checklist-finale)

---

## 1. Structure des fichiers

### Backend — `api/src/core/<feature_name>/`

```
<feature_name>/
├── __init__.py          # Fichier vide (obligatoire)
├── manifest.py          # Metadata, permissions, routers, events, dependances
├── models.py            # Modeles SQLAlchemy (si DB)
├── schemas.py           # Schemas Pydantic (si API)
├── routes.py            # Endpoints FastAPI (ou routes_*.py si plusieurs groupes)
└── services.py          # Logique metier (optionnel)
```

### Frontend — `app/src/core/<feature_name>/`

```
<feature_name>/
├── index.ts             # Export du manifest + routes + navItems
├── <Page>.tsx           # Composant(s) React
├── <page>.scss          # Styles SCSS (jamais de CSS brut, jamais d'inline)
└── i18n/
    ├── fr.json          # Traductions francaises (obligatoire)
    └── en.json          # Traductions anglaises — stub ou complet (obligatoire)
```

---

## 2. Manifest backend

Fichier : `api/src/core/<feature_name>/manifest.py`

### Feature simple

```python
from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="ma_feature",
    label="Ma Feature",
    description="Description courte de la feature",
    permissions=[
        "ma_feature.read",
        "ma_feature.manage",
    ],
    router_module="src.core.ma_feature.routes",
    router_prefix="/api/ma-feature",
    router_tags=["MaFeature"],
)
```

### Champs disponibles

| Champ | Type | Description |
|-------|------|-------------|
| `name` | `str` | Identifiant unique (ex: `"event"`, `"preference.theme"`) |
| `label` | `str` | Nom affiche dans l'admin UI |
| `description` | `str` | Description courte |
| `parent` | `str \| None` | Nom de la feature parente (enfant uniquement) |
| `children` | `list[str]` | Liste des enfants (parent uniquement) |
| `depends` | `list[str]` | Dependances sur d'autres features |
| `permissions` | `list[str]` | Codes de permissions (format `feature.action`) |
| `events` | `list[dict]` | Types d'evenements emis |
| `tutorials` | `list[dict]` | Definitions de tutoriels |
| `config_keys` | `list[str]` | Cles `.env` requises |
| `router_module` | `str \| None` | Chemin d'import du module routes |
| `router_prefix` | `str \| None` | Prefixe API (ex: `"/api/events"`) |
| `router_tags` | `list[str]` | Tags OpenAPI |
| `extra_routers` | `list[dict]` | Routeurs supplementaires (multi-fichiers) |
| `middleware` | `list[Any]` | Classes middleware a enregistrer |
| `on_startup` | `Callable \| None` | Hook au demarrage |
| `on_shutdown` | `Callable \| None` | Hook a l'arret |
| `is_core` | `bool` | `True` = ne peut pas etre desactivee |

### Feature avec plusieurs routeurs

```python
manifest = FeatureManifest(
    name="ma_feature",
    # ...
    router_module="src.core.ma_feature.routes_public",
    router_prefix="/api/ma-feature",
    router_tags=["MaFeature"],
    extra_routers=[
        {"module": "src.core.ma_feature.routes_admin", "prefix": "/api/admin/ma-feature", "tags": ["MaFeature Admin"]},
    ],
)
```

---

## 3. Modeles SQLAlchemy

Fichier : `api/src/core/<feature_name>/models.py`

```python
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class MaTable(Base):
    __tablename__ = "ma_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("ix_ma_table_nom", "nom"),
    )
```

### Regles

- Style moderne : `Mapped[Type]` + `mapped_column()`
- `ForeignKey` pour les relations
- `index=True` sur les colonnes filtrees frequemment
- `DateTime(timezone=True)` pour les timestamps
- `JSONB` pour les donnees flexibles

---

## 4. Schemas Pydantic

Fichier : `api/src/core/<feature_name>/schemas.py`

```python
from datetime import datetime
from pydantic import BaseModel, Field


class MaFeatureCreate(BaseModel):
    nom: str = Field(..., min_length=1, max_length=100)
    description: str | None = None


class MaFeatureResponse(BaseModel):
    id: int
    nom: str
    description: str | None
    created_at: datetime


class MaFeatureListResponse(BaseModel):
    items: list[MaFeatureResponse]
    total: int
    page: int
    per_page: int
    pages: int
```

### Regles

- `BaseModel` pour toutes les entrees/sorties
- Pagination : `items`, `total`, `page`, `per_page`, `pages`
- Validation via `Field(...)` avec contraintes

---

## 5. Routes FastAPI

Fichier : `api/src/core/<feature_name>/routes.py`

```python
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..permissions import require_permission
from ..security import get_current_user
from .schemas import MaFeatureCreate, MaFeatureResponse, MaFeatureListResponse

router = APIRouter()


@router.get(
    "/",
    response_model=MaFeatureListResponse,
    dependencies=[Depends(require_permission("ma_feature.read"))],
)
async def list_items(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste paginee."""
    ...


@router.post(
    "/",
    response_model=MaFeatureResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("ma_feature.manage"))],
)
async def create_item(
    data: MaFeatureCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creation."""
    ...
```

### Regles absolues

- **TOUT endpoint doit avoir `require_permission()`** — aucune exception (sauf endpoints publics : `/login`, `/register`, callbacks SSO, `/mfa/verify`)
- Utiliser `Depends(get_current_user)` pour l'authentification
- Utiliser `Depends(get_db)` pour la session DB
- `Query()` avec `ge=`, `le=` pour la validation des parametres
- Codes HTTP explicites : `status.HTTP_201_CREATED`, `status.HTTP_204_NO_CONTENT`

---

## 6. Services (optionnel)

Fichier : `api/src/core/<feature_name>/services.py`

```python
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from .models import MaTable


async def list_items(
    db: AsyncSession,
    page: int = 1,
    per_page: int = 25,
) -> tuple[list[dict], int, int]:
    """Liste avec pagination."""
    total_q = await db.execute(select(func.count(MaTable.id)))
    total = total_q.scalar_one()
    pages = max(1, -(-total // per_page))

    q = select(MaTable).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    items = result.scalars().all()

    return items, total, pages
```

### Regles

- Fonctions `async` avec `AsyncSession`
- Retour pagination : `(items, total, pages)`
- SQLAlchemy Core avec `select()` (pas d'ORM query legacy)

---

## 7. Manifest frontend

Fichier : `app/src/core/<feature_name>/index.ts`

```typescript
import { lazy } from 'react'

export const manifest = {
  name: 'ma_feature',
  routes: [
    {
      path: '/admin/ma-feature',
      component: lazy(() => import('./MaFeaturePage')),
      permission: 'ma_feature.read',
    },
  ],
  navItems: [
    {
      label: 'Ma Feature',
      path: '/admin/ma-feature',
      icon: 'box',              // Nom d'icone Feather (lucide)
      section: 'admin',         // 'admin' ou 'user'
      adminGroup: 'general',    // Sous-groupe dans le menu admin
      permission: 'ma_feature.read',
      order: 30,                // Ordre d'affichage (plus bas = plus haut)
    },
  ],
}
```

### Proprietes d'un navItem

| Propriete | Type | Description |
|-----------|------|-------------|
| `label` | `string` | Texte affiche (traduit via i18n) |
| `path` | `string` | Chemin de la route |
| `icon` | `string` | Nom d'icone Feather/Lucide |
| `section` | `'admin' \| 'user'` | Section du menu |
| `adminGroup` | `string` | Sous-groupe admin (ex: `'securite'`, `'general'`) |
| `permission` | `string` | Permission requise pour afficher |
| `order` | `number` | Ordre de tri |
| `exact` | `boolean` | Match exact du chemin |

---

## 8. Composants React

### Regles obligatoires

```tsx
import { useTranslation } from 'react-i18next'
import './MaFeaturePage.scss'

export default function MaFeaturePage() {
  const { t } = useTranslation('ma_feature')

  return (
    <div className="ma-feature-page">
      <h1>{t('titre')}</h1>
      <p>{t('description')}</p>
    </div>
  )
}
```

| Regle | Detail |
|-------|--------|
| **Pas d'inline style** | `style={{}}` est interdit. Tout dans les `.scss` |
| **Exception inline** | `style={{ '--var-name': dbValue }}` autorise uniquement pour injecter des valeurs dynamiques de la DB |
| **Dark + Light** | Tout composant doit supporter les deux themes |
| **Traductions** | Aucun texte hardcode — tout passe par `t('cle')` |
| **Permissions** | Utiliser `useContext(PermissionContext)` + `hasPermission()` pour conditionner l'affichage |
| **Lazy loading** | Les composants de page sont importes avec `lazy()` dans l'index.ts |

---

## 9. SCSS — regles obligatoires

Fichier : `app/src/core/<feature_name>/<feature>.scss`

### Conversion px → rem (obligatoire pour font-size)

```
10px = 0.625rem    │  14px = 0.875rem    │  20px = 1.25rem
11px = 0.6875rem   │  15px = 0.9375rem   │  24px = 1.5rem
12px = 0.75rem     │  16px = 1rem        │  28px = 1.75rem
13px = 0.8125rem   │  18px = 1.125rem    │
```

### Variables CSS obligatoires

```scss
// ---- FONT-SIZE : toujours en rem, JAMAIS en px ----
font-size: 1rem;                                    // ✅
font-size: 16px;                                    // ❌ INTERDIT

// ---- BORDER-RADIUS : toujours var(--radius) ----
border-radius: var(--radius);                       // ✅
border-radius: 8px;                                 // ❌ INTERDIT (sauf 50% pour cercles)

// ---- PADDING : variables de densite ----
// Boutons
padding: var(--density-btn-padding, 8px 16px);
// Inputs
padding: var(--density-input-padding, 8px 12px);
// Cellules de table
padding: var(--density-padding, 12px 20px);
// Cards
padding: var(--density-card-padding, 24px);

// ---- GAPS ----
gap: var(--density-gap, 12px);                      // Entre elements
gap: var(--section-gap, 24px);                      // Entre sections

// ---- LAYOUT ----
max-width: var(--content-max-width, 960px);         // Conteneur principal

// ---- FONT-FAMILY : ne pas definir ----
// Le body propage var(--font-family) automatiquement
// Seul cas : font-family: monospace (pour du code)

// ---- ACCESSIBILITE ----
// Ne PAS utiliser !important sur : transition, outline, font-family
// Les classes a11y-* globales peuvent les surcharger
```

### Variables disponibles — reference complete

| Variable | Defaut | Source |
|----------|--------|--------|
| `--font-family` | system stack | `preference.font` |
| `--line-height` | `1.5` | `preference.font` |
| `--font-weight` | `400` | `preference.font` |
| `--radius` | `8px` | `preference.layout` |
| `--density-padding` | `12px 16px` | `preference.layout` |
| `--density-gap` | `12px` | `preference.layout` |
| `--density-btn-padding` | `8px 16px` | `preference.layout` |
| `--density-input-padding` | `8px 12px` | `preference.layout` |
| `--density-card-padding` | `24px` | `preference.layout` |
| `--content-max-width` | `960px` | `preference.layout` |
| `--section-gap` | `24px` | `preference.layout` |

### Theme dark — pattern obligatoire

```scss
.ma-feature-card {
  background: var(--gray-50);
  color: var(--text-primary, var(--gray-700));
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);

  [data-theme="dark"] & {
    background: var(--gray-100);
    color: rgba(255, 255, 255, 0.9);
    border-color: rgba(255, 255, 255, 0.15);
  }
}

.ma-feature-input {
  padding: var(--density-input-padding, 8px 12px);
  font-size: 0.875rem;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  background: var(--gray-50);

  &:focus {
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  [data-theme="dark"] & {
    background: var(--gray-100);
    border-color: rgba(255, 255, 255, 0.15);

    &:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}
```

---

## 10. Internationalisation (i18n)

### Fichier FR — `app/src/core/<feature_name>/i18n/fr.json`

```json
{
  "titre": "Ma Feature",
  "description": "Description de la feature",
  "breadcrumb_accueil": "Accueil",
  "breadcrumb_ma_feature": "Ma Feature",
  "rechercher": "Rechercher...",
  "aucun_resultat": "Aucun resultat",
  "btn_creer": "Creer",
  "btn_modifier": "Modifier",
  "btn_supprimer": "Supprimer",
  "col_nom": "Nom",
  "col_date": "Date",
  "confirm_suppression": "Voulez-vous vraiment supprimer cet element ?",
  "aria_loading": "Chargement en cours...",
  "aria_table_caption": "Tableau de ma feature"
}
```

### Fichier EN — `app/src/core/<feature_name>/i18n/en.json`

```json
{
  "titre": "My Feature",
  "description": "Feature description",
  "breadcrumb_accueil": "Home",
  "breadcrumb_ma_feature": "My Feature",
  "rechercher": "Search...",
  "aucun_resultat": "No results",
  "btn_creer": "Create",
  "btn_modifier": "Edit",
  "btn_supprimer": "Delete",
  "col_nom": "Name",
  "col_date": "Date",
  "confirm_suppression": "Are you sure you want to delete this item?",
  "aria_loading": "Loading...",
  "aria_table_caption": "My feature table"
}
```

### Regles

| Regle | Detail |
|-------|--------|
| **Namespace = nom de la feature** | `useTranslation('ma_feature')` |
| **Cles en snake_case** | `titre`, `btn_creer`, `col_nom` |
| **Aucun texte hardcode** | Tout passe par `t('cle')` |
| **Labels d'accessibilite** | Inclure les cles `aria_*` pour les lecteurs d'ecran |
| **Interpolation** | `t('message', { name, count })` — variables en 2e argument |
| **Textes communs** | Utiliser le namespace `common` pour les boutons generiques ("Annuler", "Sauvegarder") — fichier `app/src/core/i18n/locales/fr/common.json` |
| **Hors arbre React** | Utiliser `i18next.t('common:cle')` directement |
| **Constantes avec labels** | Utiliser `labelKey` (cle de traduction) au lieu de texte en dur |
| **Fichier EN obligatoire** | Peut etre un stub avec valeurs vides `""` ou traduit |

---

## 11. Permissions

### Format

```
feature.action           →  ma_feature.read
feature.sub.action       →  ma_feature.items.create
parent.child.action      →  preference.theme.read
```

### Actions courantes

| Action | Description |
|--------|-------------|
| `read` | Voir / lister |
| `create` | Creer |
| `update` | Modifier |
| `delete` | Supprimer |
| `manage` | Controle complet |
| `send` | Transmettre |
| `export` | Exporter |
| `import` | Importer |

### Declaration dans le manifest backend

```python
permissions=[
    "ma_feature.read",
    "ma_feature.create",
    "ma_feature.update",
    "ma_feature.delete",
],
```

### Utilisation cote backend

```python
@router.get("/", dependencies=[Depends(require_permission("ma_feature.read"))])
async def list_items(...):
    ...
```

### Utilisation cote frontend

```typescript
// Dans index.ts
routes: [{ path: '/admin/ma-feature', component: ..., permission: 'ma_feature.read' }]

// Dans un composant
const { hasPermission } = useContext(PermissionContext)
{hasPermission('ma_feature.delete') && <button>{t('btn_supprimer')}</button>}
```

### Sync automatique

1. Les permissions declarees dans `manifest.py` sont **auto-sync en DB** au demarrage de l'API
2. Le role `super_admin` recoit automatiquement les nouvelles permissions
3. Pour attribuer a `admin` ou en `GlobalPermission` → creer une **migration Alembic data**

---

## 12. Events

### Declaration dans le manifest

```python
events=[
    {
        "event_type": "ma_feature.created",
        "label": "Element cree",
        "category": "MaFeature",
        "description": "Un nouvel element a ete cree",
    },
    {
        "event_type": "ma_feature.deleted",
        "label": "Element supprime",
        "category": "MaFeature",
        "description": "Un element a ete supprime",
    },
],
```

### Emission dans le code

```python
from ..event.services import persist_event

await persist_event(
    db=db,
    event_type="ma_feature.created",
    actor_id=current_user.id,
    resource_type="ma_feature",
    resource_id=item.id,
    payload={"nom": item.nom},
)
```

---

## 13. Tutorials

### Declaration dans le manifest

```python
tutorials=[
    {
        "permission": "ma_feature.read",
        "label": "Decouvrir Ma Feature",
        "description": "Apprenez a utiliser cette fonctionnalite.",
        "steps": [
            {
                "target": ".page-header-card",
                "title": "Vue d'ensemble",
                "description": "Cette page presente la liste des elements.",
                "position": "bottom",            # top, bottom, left, right
                "navigateTo": "/admin/ma-feature" # Optionnel : navigation auto
            },
            {
                "target": ".ma-feature-create-btn",
                "title": "Creer un element",
                "description": "Cliquez ici pour ajouter un nouvel element.",
                "position": "right"
            },
        ]
    }
],
```

---

## 14. Feature enfant (parent/child)

### Structure

```
api/src/core/
├── parent_feature/
│   ├── __init__.py
│   ├── manifest.py          # children=["parent_feature.child"]
│   ├── models.py
│   ├── routes.py
│   └── child/
│       ├── __init__.py
│       └── manifest.py      # parent="parent_feature"

app/src/core/
├── parent_feature/
│   ├── index.ts             # Manifest parent + routes globales
│   ├── ParentPage.tsx
│   ├── i18n/fr.json
│   ├── i18n/en.json
│   └── child/
│       ├── ChildSection.tsx
│       └── i18n/
│           ├── fr.json
│           └── en.json
```

### Manifest parent

```python
manifest = FeatureManifest(
    name="parent_feature",
    label="Parent Feature",
    description="Feature parente",
    children=["parent_feature.child_a", "parent_feature.child_b"],
    permissions=["parent_feature.read"],
)
```

### Manifest enfant

```python
from ...feature_registry import FeatureManifest  # Remonter de 2 niveaux

manifest = FeatureManifest(
    name="parent_feature.child_a",
    label="Child A",
    description="Sous-feature A",
    parent="parent_feature",
    depends=["parent_feature.child_b"],  # Dependance sur un frere (optionnel)
    permissions=["parent_feature.child_a.read"],
    router_module="src.core.parent_feature.child_a.routes",
    router_prefix="/api/parent-feature/child-a",
    router_tags=["ParentFeature ChildA"],
)
```

---

## 15. Migration Alembic

Si la feature cree des tables, generer une migration :

```bash
docker compose exec api alembic -c alembic/alembic.ini revision --autogenerate -m "add ma_feature tables"
```

Pour des donnees de bootstrap (global permissions, roles, etc.) → migration data :

```bash
docker compose exec api alembic -c alembic/alembic.ini revision -m "add ma_feature global permissions"
```

```python
"""add ma_feature global permissions"""

import sqlalchemy as sa
from alembic import op


def upgrade():
    op.execute(sa.text("""
        INSERT INTO global_permissions (permission_id)
        SELECT id FROM permissions WHERE code = 'ma_feature.read'
        ON CONFLICT DO NOTHING;
    """))


def downgrade():
    op.execute(sa.text("""
        DELETE FROM global_permissions
        WHERE permission_id IN (SELECT id FROM permissions WHERE code = 'ma_feature.read');
    """))
```

---

## 16. Checklist finale

Avant de considerer la feature comme terminee :

### Backend
- [ ] `__init__.py` present
- [ ] `manifest.py` avec `name`, `label`, `permissions`, `router_module`, `router_prefix`, `router_tags`
- [ ] Permissions au format `feature.action`
- [ ] `require_permission()` sur **tous** les endpoints
- [ ] `Depends(get_current_user)` + `Depends(get_db)` dans les routes
- [ ] Events declares dans le manifest (si pertinent)
- [ ] Events emis via `persist_event()` dans les services/routes
- [ ] Tutorials declares dans le manifest (si pertinent)
- [ ] Migration Alembic generee (si modeles DB)
- [ ] Migration data pour GlobalPermission (si permissions pour tous les users)

### Frontend
- [ ] `index.ts` avec manifest, routes et navItems
- [ ] `lazy(() => import(...))` pour les composants de page
- [ ] `permission` sur les routes et navItems
- [ ] Fichier `.scss` — aucun inline style
- [ ] SCSS : `font-size` en `rem`, `border-radius: var(--radius)`, variables de densite
- [ ] SCSS : theme dark supporte (`[data-theme="dark"] &`)
- [ ] `i18n/fr.json` avec toutes les chaines visibles
- [ ] `i18n/en.json` (stub ou traduit)
- [ ] `useTranslation('namespace')` dans les composants
- [ ] Aucun texte hardcode dans les TSX
- [ ] Labels aria pour l'accessibilite

### Transversal
- [ ] Feature template ne depend pas d'une feature projet
- [ ] `CHANGELOG.md` mis a jour
- [ ] Version bump dans `app/package.json` et `api/src/main.py`
- [ ] Lints passes (`act push` ou `act -j lint-backend -j lint-frontend`)
- [ ] `alembic check` passe (si modeles modifies)

---

## Rappels importants

| Regle | Detail |
|-------|--------|
| **Docker uniquement** | Toutes les commandes (build, install, migrations) s'executent dans Docker. Exceptions : `git` et `act` |
| **Bun, pas npm** | Le frontend utilise Bun comme package manager |
| **RBAC strict** | Ne jamais checker `user.is_super_admin` — utiliser `require_permission()` |
| **Pas de tests auto** | Ne pas ajouter de tests sauf demande explicite |
| **Commit via `/commit`** | Utilise la procedure complete (lints, alembic check, version bump, commit) |
| **RGPD** | Toute ecriture localStorage/sessionStorage doit respecter le consentement (`hasConsent()`) |
| **CalVer** | Versioning `YYYY.MM.N` — un seul increment par commit/merge sur master |
