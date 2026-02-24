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

## Etape 1 — CI complete via act

Lancer **toute la CI** via `act` (sur la machine hote, pas Docker) :

```bash
act push
```

Cette commande execute TOUS les jobs definis dans `.github/workflows/ci.yml` (lints, build, migrations, etc.). Ne pas specifier de jobs individuels — `act push` garantit que toute nouvelle step ajoutee au CI sera automatiquement verifiee.

- Si ca echoue : corriger les erreurs, relancer jusqu'a ce que tout passe
- Ne JAMAIS passer a l'etape suivante si la CI echoue

## Etape 2 — Version bump

1. Lire `CHANGELOG.md` pour trouver la version actuelle
2. Si les changements ne sont pas encore documentes dans le CHANGELOG :
    - Incrementer la version N dans `CHANGELOG.md` (nouvelle section en haut)
    - Bumper `app/package.json` → `"version"`
    - Bumper `api/src/main.py` → `version=` dans `create_app()`
3. Si le CHANGELOG est deja a jour, verifier que les 3 fichiers sont coherents

## Etape 3 — Git add + commit

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

## Etape 4 — Verification post-commit

```bash
git status
git log --oneline -1
```

Confirmer que le commit est propre et que tout est ok.

## Etape 5 — Continuer le developpement

executer la commande `/dev-reset`
