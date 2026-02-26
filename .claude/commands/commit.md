Tu dois effectuer un commit propre en suivant cette procedure stricte :

## Etape 0 — Prerequis : verifier que `act` est disponible

1. Tester si `act` est dans le PATH :
    ```bash
    act --version
    ```
2. Si `act` n'est pas trouve :
    - Chercher l'executable sur le disque (WinGet, scoop, go/bin, etc.) :
        ```bash
        powershell.exe -NoProfile -Command "Get-ChildItem -Path 'C:\' -Filter 'act.exe' -Recurse -Depth 5 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName"
        ```
    - Si trouve : le copier dans un dossier deja dans le PATH (ex: `~/bin/`) et verifier avec `act --version`
    - Si pas trouve : l'installer via `winget install nektos.act`, puis chercher l'exe installe et le copier dans `~/bin/`
3. Ne JAMAIS passer a l'etape suivante si `act --version` ne fonctionne pas

## Etape 1 — Verification pre-CI (CSS, permissions, events)

Avant de lancer la CI, verifier la conformite des fichiers modifies (via `git diff --name-only HEAD`). Utiliser les outils Grep/Glob/Read pour chaque verification. **Corriger automatiquement** tout ce qui peut l'etre, sinon lister les problemes et demander a l'utilisateur.

### 1a — Regles CSS/SCSS

Scanner UNIQUEMENT les fichiers `.scss` modifies dans le diff.

| # | Regle | Pattern interdit | Correction attendue |
|---|-------|-----------------|---------------------|
| 1 | `font-size` en px | `font-size: Npx` | Convertir en `rem` (diviser par 16). Table : 10px=0.625rem, 11px=0.6875rem, 12px=0.75rem, 13px=0.8125rem, 14px=0.875rem, 15px=0.9375rem, 16px=1rem, 18px=1.125rem, 20px=1.25rem, 24px=1.5rem, 28px=1.75rem |
| 2 | `border-radius` hardcode | `border-radius: Npx` (sauf `50%` et `0`) | Remplacer par `border-radius: var(--radius)` |
| 3 | Padding interactif | `padding:` hardcode dans boutons, inputs, cellules de table, cards | Boutons → `var(--density-btn-padding, 8px 16px)`, inputs → `var(--density-input-padding, 8px 12px)`, cellules table → `var(--density-padding, 12px 20px)`, cards → `var(--density-card-padding, 24px)` |
| 4 | Gap conteneurs page | `gap:` hardcode dans conteneurs de page/sections | Remplacer par `gap: var(--section-gap, 24px)` |
| 5 | Max-width conteneur | `max-width:` hardcode sur conteneurs principaux | Remplacer par `max-width: var(--content-max-width, 1200px)` |
| 6 | `font-family` explicite | `font-family:` (sauf `monospace`) | Supprimer — le body propage `var(--font-family)` via heritage CSS |
| 7 | `!important` accessibilite | `!important` sur `transition`, `outline`, `font-family` | Supprimer le `!important` — les classes `a11y-*` globales doivent pouvoir surcharger |
| 8 | Dark theme | Selecteurs de couleur/background dans `.scss` modifies | Verifier qu'un bloc `[data-theme="dark"] &` ou equivalent existe si des couleurs sont definies |
| 9 | Style inline dans TSX | `style={{` dans les `.tsx` modifies | Interdit sauf `style={{ '--var-name': value }}` (injection CSS variable depuis la DB). Deplacer le style dans un `.scss` |

### 1b — Permissions

Pour chaque fichier `routes*.py` modifie :

1. **Chaque endpoint doit avoir `require_permission()`** — Scanner les decorateurs `@router.get/post/put/patch/delete` et verifier que `dependencies=[Depends(require_permission(...))]` est present (exceptions : `/stream` SSE avec auth par token, endpoints publics comme `/login`)
2. **Permission declaree dans le manifest** — Collecter toutes les permissions utilisees dans `require_permission("xxx")` des fichiers modifies, puis verifier qu'elles existent dans le `manifest.py` de la feature correspondante (champ `permissions=[]`)
3. **Permission dans les fixtures** — Verifier que chaque permission du manifest existe dans `api/alembic/fixtures/permissions.py` (`ALL_PERMISSIONS`)
4. Si une permission manque : l'ajouter au manifest et aux fixtures, informer l'utilisateur

### 1c — Events

Pour chaque fichier `routes*.py` ou `services*.py` modifie :

1. **Events emis declares dans le manifest** — Collecter tous les `event_bus.emit("event_type", ...)` des fichiers modifies, puis verifier que chaque `event_type` est declare dans le `manifest.py` de la feature (champ `events=[]`)
2. **Coherence emit/manifest** — Si un event est emis mais pas declare dans le manifest, l'ajouter au manifest avec le format :
    ```python
    {"event_type": "feature.action", "label": "Description courte", "category": "NomFeature", "description": "Description longue"}
    ```
3. Informer l'utilisateur des events ajoutes

### Resume etape 1

- Si des corrections sont appliquees, lister les changements effectues
- Si tout est conforme, afficher "Pre-CI checks OK"
- Ne JAMAIS passer a l'etape suivante s'il reste des problemes non resolus

## Etape 2 — CI complete via act

Lancer **toute la CI** via `act` (sur la machine hote, pas Docker) :

```bash
act push
```

Cette commande execute TOUS les jobs definis dans `.github/workflows/ci.yml` (lints, build, migrations, etc.). Ne pas specifier de jobs individuels — `act push` garantit que toute nouvelle step ajoutee au CI sera automatiquement verifiee.

- Si ca echoue : corriger les erreurs, relancer jusqu'a ce que tout passe
- Ne JAMAIS passer a l'etape suivante si la CI echoue

## Etape 3 — Version bump

1. Lire `CHANGELOG.md` pour trouver la version actuelle
2. Si les changements ne sont pas encore documentes dans le CHANGELOG :
    - Incrementer la version N dans `CHANGELOG.md` (nouvelle section en haut)
    - Bumper `app/package.json` → `"version"`
    - Bumper `api/src/main.py` → `version=` dans `create_app()`
3. Si le CHANGELOG est deja a jour, verifier que les 3 fichiers sont coherents

## Etape 4 — Git add + commit

```bash
git add -f .claude/CLAUDE.md  # si modifie (force car .gitignore)
git add <tous les fichiers modifies>
git commit -m "<message>"
```

Format du message de commit :

- Prefixe : `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` selon le type
- Inclure `— vYYYY.MM.N` a la fin de la premiere ligne
- Description courte (1 ligne) + details en corps si necessaire
- Toujours terminer par : `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`

## Etape 5 — Verification post-commit

```bash
git status
git log --oneline -1
```

Confirmer que le commit est propre et que tout est ok.

## Etape 6 — Continuer le developpement

executer la commande `/dev-reset`
