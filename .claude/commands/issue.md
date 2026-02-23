Tu dois creer une issue dans le dossier `./issues/` en suivant cette procedure.

L'utilisateur peut te donner une description rapide et informelle — ton role est de la structurer proprement.

## Etape 1 — Comprendre le probleme

Si la description de l'utilisateur est vague :
- Poser 1-2 questions ciblees pour clarifier (quoi, ou, quand ca arrive)
- Ne pas poser plus de 2 questions — faire au mieux avec ce qu'on a

Si l'utilisateur a mentionne un comportement observable :
- Consulter les logs Docker pour plus de contexte :
  ```bash
  docker compose logs api --tail=100 2>/dev/null
  docker compose logs app --tail=50 2>/dev/null
  ```
- Chercher des erreurs, warnings, stack traces lies au probleme
- Si les logs revelent des infos supplementaires, les integrer dans l'issue

## Etape 2 — Chercher les doublons

Avant de creer une nouvelle issue, verifier si le probleme est deja enregistre :

```bash
ls ./issues/ | sort
```

Puis lire les titres et descriptions des issues existantes qui pourraient correspondre :
- Chercher par mots-cles dans les fichiers issues (Grep sur `./issues/`)
- Chercher par feature concernee
- Chercher par fichier/composant mentionne

Si une issue similaire existe :
1. Montrer a l'utilisateur l'issue trouvee (numero, titre, description courte)
2. Demander : "Cette issue existe deja : `{SEVERITE}-{NUM} : {titre}`. C'est le meme probleme, ou c'est different ?"
3. Si c'est le meme → proposer de **completer l'issue existante** avec les nouvelles infos (logs, contexte, etapes de reproduction supplementaires) au lieu d'en creer une nouvelle
4. Si c'est different → continuer la creation normalement

## Etape 3 — Determiner la severite et le type

### Severites (bugs)

| Severite | Criteres |
|----------|----------|
| **CRITICAL** | Securite (bypass auth, injection, data leak), perte de donnees, feature core completement cassee |
| **HIGH** | Bug visible qui impacte l'UX principale, faille de securite mitigee, probleme de performance majeur |
| **MEDIUM** | Bug visible mais contournable, inconsistance UX, violation des conventions du projet |
| **LOW** | Bug cosmetique, amelioration mineure, dette technique sans impact utilisateur |

### Type lacune fonctionnelle

| Type | Criteres |
|------|----------|
| **GAP** | Fonctionnalite manquante, feature incomplete, besoin non couvert |

## Etape 4 — Determiner le prochain numero

Lire les fichiers existants dans `./issues/` pour trouver le prochain numero disponible :

```bash
ls ./issues/ | sort
```

Regles de numerotation :
- **Bugs** : numerotation continue globale (CRITICAL-01, HIGH-05, MEDIUM-10, LOW-19...). Prendre le **dernier numero tous types confondus + 1**
- **GAP** : numerotation separee (GAP-01, GAP-02...). Prendre le **dernier GAP + 1**

## Etape 5 — Identifier la feature concernee

Determiner quelle feature est concernee. Si pas evident :
- Chercher dans le code source le fichier/composant mentionne
- Se referer a `./feature_check.md` pour la liste des features et leurs chemins

## Etape 6 — Localiser dans le code

Chercher les fichiers concernes dans le codebase :
- Utiliser Grep/Glob pour trouver les fichiers pertinents
- Noter les fichiers + numeros de lignes precis
- Si le probleme est cote API, verifier aussi cote APP (et inversement)

## Etape 7 — Creer le fichier issue

Nom du fichier : `./issues/{SEVERITE}-{NUM}-{slug}.md`

Le slug doit etre : court (2-4 mots), en kebab-case, descriptif du probleme.

### Template pour les bugs (CRITICAL, HIGH, MEDIUM, LOW)

```markdown
# {SEVERITE}-{NUM} : {Titre court et descriptif}

## Statut : OPEN

## Severite : {CRITICAL|HIGH|MEDIUM|LOW}

## Feature concernee : `{feature_name}`

## Localisation
- `{chemin/vers/fichier.py:lignes}` — {description courte de ce qu'il y a la}
- `{chemin/vers/autre_fichier.tsx:lignes}` — {si applicable}

## Description
{Description claire du bug en 2-3 phrases. Qu'est-ce qui se passe vs qu'est-ce qui devrait se passer.}

## Impact
**{Categorie}** : {Qui est impacte et comment. Ex: "Tous les utilisateurs voient X au lieu de Y."}

## Reproduction
1. {Etape 1}
2. {Etape 2}
3. Observer : {comportement actuel}
4. Attendu : {comportement attendu}

## Contexte technique
{Explication technique de la cause racine si identifiee. Code concerne, flux, conditions.}

## Lien avec d'autres issues
- {Lie a XXXX-NN si pertinent}
- {Bloque/bloque par XXXX-NN si pertinent}

## Fix suggere
{Approche recommandee pour corriger. Peut inclure du pseudo-code ou des snippets.}

## Logs Docker (si pertinent)
{Extraits de logs qui aident a comprendre le probleme. Laisser vide si pas de logs pertinents.}

## Resolution
_(rempli au moment du fix — ne pas remplir a la creation)_
```

### Template pour les lacunes (GAP)

```markdown
# GAP-{NUM} : {Titre court et descriptif}

## Statut : OPEN

## Type : Lacune fonctionnelle

## Feature concernee : `{feature_name}`

## Description
{Ce qui manque, en 2-3 phrases.}

## Besoin
- {Besoin 1}
- {Besoin 2}
- {Besoin 3}

## Lien avec d'autres features
- {Dependencies, features qui beneficieraient de cette lacune comblee}

## Complexite estimee
{Faible / Moyenne / Elevee} — {justification courte}

## Resolution
_(rempli au moment de l'implementation — ne pas remplir a la creation)_
```

## Etape 8 — Confirmation

Afficher un resume a l'utilisateur :
- Numero et titre de l'issue
- Severite
- Feature concernee
- Chemin du fichier cree

Ne PAS modifier `feature_check.md` — ce fichier est mis a jour uniquement pendant la revue des features.
