# Feature Check — Revue systematique des features core

## Prompt de travail

> Prends la premiere feature de la liste non cochee. Fais une analyse complete de la feature dans le projet (API : manifest, routes, services, models, schemas + APP : composants, contextes, SCSS, i18n). Presente-moi un bilan d'utilisation : ce que tu sais de la feature, son perimetre, ses comportements conditionnels, ses roles/permissions, ses interactions avec d'autres features, et les bugs potentiels que tu detectes dans le code. L'objectif est de reviser chaque feature, corriger les bugs un par un, et quand on valide qu'elle fonctionne correctement, on coche la case. En parallele, documente ce qu'on a decouvert et corrige dans `./docs/core/{feature}/README.md` (et `./docs/core/{feature}/{sub-feature}/README.md` pour les sous-features).
>
> **Issues** : Avant de commencer une feature, consulte les fichiers dans `./issues/` pour voir les bugs deja identifies qui la concernent (Grep par nom de feature). Pour chaque bug corrige : passe le statut a `IN_PROGRESS` quand tu commences, remplis la section `## Resolution` (fix applique, fichiers modifies, version, commit), puis passe a `FIXED`. Si tu decouvres un nouveau bug pendant la revue, utilise `/issue` pour le creer proprement.

---

## Issues (bugs detectes)

Chaque bug est documente dans un fichier individuel dans `./issues/` pour garder le contexte entre sessions.

**Convention de nommage** : `{SEVERITE}-{NUM}-{slug}.md`

| Severite | Fichiers | Count |
|----------|----------|-------|
| CRITICAL | `issues/CRITICAL-01-*.md` a `issues/CRITICAL-04-*.md` | 4 |
| HIGH | `issues/HIGH-05-*.md` a `issues/HIGH-09-*.md` | 5 |
| MEDIUM | `issues/MEDIUM-10-*.md` a `issues/MEDIUM-18-*.md` | 9 |
| LOW | `issues/LOW-19-*.md` a `issues/LOW-25-*.md` | 7 |
| GAP | `issues/GAP-01-*.md` a `issues/GAP-05-*.md` | 5 (lacunes fonctionnelles) |

**Total : 30 issues**

Pour ajouter une issue rapidement : utiliser la commande **`/issue`** qui guide la redaction, check les logs Docker, et cree le fichier formate.

### Structure d'un fichier issue (bug)

```
# {SEVERITE}-{NUM} : {Titre court}

## Statut : OPEN | IN_PROGRESS | FIXED | WONTFIX

## Severite : CRITICAL | HIGH | MEDIUM | LOW

## Feature concernee : `{feature_name}`

## Localisation
- `{chemin/fichier.py:lignes}` — description courte

## Description
Qu'est-ce qui se passe vs qu'est-ce qui devrait se passer.

## Impact
**{Categorie}** : qui est impacte et comment.

## Reproduction
1. Etape 1...
2. Observer : {actuel}
3. Attendu : {attendu}

## Contexte technique
Cause racine, flux concerne, conditions.

## Lien avec d'autres issues
- Lie a / Bloque par XXXX-NN

## Fix suggere
Approche recommandee, pseudo-code ou snippets.

## Logs Docker (si pertinent)
Extraits de logs.

## Resolution
_(rempli au moment du fix)_
- **Fix applique** : description courte de ce qui a ete change
- **Fichiers modifies** : liste des fichiers touches
- **Version** : vYYYY.MM.N
- **Commit** : hash court
```

### Structure d'un fichier issue (lacune fonctionnelle)

```
# GAP-{NUM} : {Titre court}

## Statut : OPEN | IN_PROGRESS | DONE

## Type : Lacune fonctionnelle

## Feature concernee : `{feature_name}`

## Description
Ce qui manque.

## Besoin
- Besoin 1, 2, 3...

## Lien avec d'autres features
- Dependencies, features liees

## Complexite estimee
Faible / Moyenne / Elevee — justification

## Resolution
_(rempli au moment de l'implementation)_
- **Implementation** : description courte
- **Fichiers crees/modifies** : liste
- **Version** : vYYYY.MM.N
- **Commit** : hash court
```

### Numerotation

- **Bugs** : numerotation continue globale (CRITICAL-01, HIGH-05, ...). Prochain = dernier numero tous types confondus + 1
- **GAP** : numerotation separee (GAP-01, GAP-02, ...). Prochain = dernier GAP + 1

### Cycle de vie d'une issue

```
OPEN → IN_PROGRESS → FIXED / DONE / WONTFIX
```

**Quand tu corriges un bug ou implementes une lacune, tu DOIS mettre a jour le fichier issue** :

1. Passer le statut a `IN_PROGRESS` quand tu commences le fix
2. Remplir la section `## Resolution` avec : fix applique, fichiers modifies, version, commit
3. Passer le statut a `FIXED` (bug) ou `DONE` (GAP) une fois le fix valide
4. Si on decide de ne pas corriger : statut `WONTFIX` + explication dans Resolution

Cela s'applique dans **tous les contextes** :
- Pendant la revue systematique d'une feature
- Pendant un hotfix direct hors revue
- Pendant le dev d'une nouvelle feature qui corrige un bug au passage

### Criteres de severite

| Severite | Criteres |
|----------|----------|
| **CRITICAL** | Securite (bypass auth, injection, data leak), perte de donnees, feature core cassee |
| **HIGH** | Bug visible impactant l'UX principale, faille mitigee, perf majeure |
| **MEDIUM** | Bug contournable, inconsistance UX, violation conventions projet |
| **LOW** | Cosmetique, amelioration mineure, dette technique sans impact user |

---

## Legende

- `[ ]` = pas encore revise
- `[~]` = en cours de revue
- `[x]` = revise, corrige, documente

---

## Checklist des features (ordre des dependances)

### Phase 1 — Fondations

| # | Check | Feature | Type | Dependances | Chemins API | Chemins APP | Notes |
|---|-------|---------|------|-------------|-------------|-------------|-------|
| 1 | [x] | `_identity` | parent | aucune | `api/src/core/_identity/` | `app/src/core/_identity/` | Auth, users, roles, permissions, features, settings, invitations, impersonation, backups, commands — 12 routers, 20 permissions |
| 2 | [x] | `i18n` | standalone | aucune | `api/src/core/i18n/` | `app/src/core/i18n/` | Middleware locale, API traductions, auto-decouverte JSON |
| 3 | [x] | `event` | standalone | aucune | `api/src/core/event/` | `app/src/core/event/` | Event bus, persistence, catalogue d'events — 3 perms, 2 pages (journal + types), sort whitelist, 22 events _identity |

### Phase 2 — Authentification externe

| # | Check | Feature | Type | Dependances | Chemins API | Chemins APP | Notes |
|---|-------|---------|------|-------------|-------------|-------------|-------|
| 4 | [x] | `sso` | parent | _identity | `api/src/core/sso/` | `app/src/core/sso/` | OAuth2, SSOButtons, SSOCallbackPage — 1 perm (`sso.link`), 8 events, 9 endpoints, hardening comptes desactives, auto-link audit, modal confirm i18n |
| 5 | [x] | `sso.github` | child | sso | `api/src/core/sso/github/` | (dans sso/) | GitHub OAuth2, config SSO_GITHUB_* — state JWTError, perm sso.link sur /link, IP dans audit |
| 6 | [x] | `sso.google` | child | sso | `api/src/core/sso/google/` | (dans sso/) | Google OAuth2, config SSO_GOOGLE_* — state JWTError, perm sso.link sur /link, IP dans audit |

### Phase 3 — Securite MFA

| # | Check | Feature | Type | Dependances | Chemins API | Chemins APP | Notes |
|---|-------|---------|------|-------------|-------------|-------------|-------|
| 7 | [x] | `mfa` | parent | _identity | `api/src/core/mfa/` | `app/src/core/mfa/` | MFA policy, verify page, force setup, admin policy — 3 perms, 12 events, 13 bugs + bypass user-only (assignment_rules DB-driven), 500 policy fix, /me mfa_setup sync |
| 8 | [x] | `mfa.totp` | child | mfa | `api/src/core/mfa/totp/` | (dans mfa/) | Google Authenticator / TOTP apps — 2 fixes (require_permission sur 3 endpoints, flush redondant) |
| 9 | [x] | `notification` | parent | event | `api/src/core/notification/` | `app/src/core/notification/` | In-app notifs, rules engine, SSE, NotificationBell — 4 fixes (require_permission sur 9 endpoints, sort whitelist, SSE check user actif) |
| 10 | [x] | `notification.email` | child | notification | `api/src/core/notification/email/` | (dans notification/) | SMTP delivery channel — 2 fixes (html.escape XSS sur titres/noms, permission resend alignee manifest+frontend) |
| 11 | [x] | `mfa.email` | child | mfa, notification.email | `api/src/core/mfa/email/` | (dans mfa/) | OTP par email — 4 fixes (require_permission sur 3 endpoints, check EMAIL_ENABLED avant activation, propagation erreur SMTP, backup codes affiches au frontend) + fix transversal email case-sensitivity (update profile, admin create/update user) |
| 12 | [x] | `notification.push` | child | notification | `api/src/core/notification/push/` | (dans notification/) | Web Push (VAPID) — 6 fixes (push_sent_at, require_permission+DELETE unsubscribe, resend-push endpoint+UI, SCSS var(--radius), erreur push feedback) |
| 13 | [x] | `notification.webhook` | child | notification | `api/src/core/notification/webhook/` | (dans notification/) | HTTP webhooks — 7 fixes (3 perms HIGH: delete/test/global is_global, delivery logs rule-matched, SCSS 14 border-radius + density vars, format Literal, 4 events declares+emis) |

### Phase 4 — Preferences utilisateur

| # | Check | Feature | Type | Dependances | Chemins API | Chemins APP | Notes |
|---|-------|---------|------|-------------|-------------|-------------|-------|
| 14 | [x] | `preference` | parent | aucune | `api/src/core/preference/` | `app/src/core/preference/` | PreferencePage, DraftPreferenceContext, UnsavedChangesModal — 4 fixes (require_permission 6 endpoints, children manifest complet, saveAll() error handling, SCSS density vars) |
| 15 | [x] | `preference.theme` | child | preference | (dans preference/) | `app/src/core/preference/theme/` | Dark/light, fonds visuels — 3 fixes (feature gate Alt+T + BackgroundThemePicker, backgroundTheme dans draft system, isDark reactif MutationObserver) + require_permission 2 endpoints + event preference.updated + SCSS var(--radius/--density-*) bg-theme-picker |
| 16 | [x] | `preference.font` | child | preference | (dans preference/) | `app/src/core/preference/font/` | Police, taille texte, interligne — 2 fixes (OpenDyslexic bundle local woff2 + @font-face, applyFontPrefs(null) redondant supprime) + SCSS conforme + events/perms OK |
| 17 | [x] | `preference.layout` | child | preference | (dans preference/) | `app/src/core/preference/layout/` | Densite, border-radius, largeur contenu — 7 fixes (maxWidth/sectionGap default mismatch CSS fallback, inline style preview, SCSS hardcoded gaps/radius/btn-padding, applyLayoutPrefs(null) 3 density vars manquantes, handleReset redondant) |
| 18 | [x] | `preference.couleur` | child | preference | (dans preference/) | `app/src/core/preference/couleur/` | Couleurs personnalisees — 3 fixes (classe CSS tutorial manquante sur 5 sections, SCSS density vars, border-radius var(--radius)) |
| 19 | [ ] | `preference.accessibilite` | child | preference | (dans preference/) | `app/src/core/preference/accessibilite/` | Contraste, animations, dyslexie, focus |
| 20 | [x] | `preference.composants` | child | preference | (dans preference/) | `app/src/core/preference/composants/` | Style cards, tables, modals, boutons — 5 fixes (CSS modal-anim keyframes+selecteurs, table stripes base style+dark, SCSS 6 density vars, handleReset applyNull redondant, selecteurs preview-btn redondants) |
| 21 | [x] | `preference.langue` | child | preference, i18n | (dans preference/) | `app/src/core/preference/langue/` | Preference de langue utilisateur — 5 fixes (axios brut→api HIGH, double save, LOCALE_LABELS duplique+accents, event preference.updated, JWT lang claim stale→new token) |
| 22 | [x] | `preference.didacticiel` | child | preference | `api/src/core/preference/didacticiel/` | `app/src/core/preference/didacticiel/` | Tutoriels in-app, TutorialEngine — 6 fixes (Rules of Hooks, CSS target class, SCSS var(--radius)/density, RGPD hasConsent, useEffect deps) + events preference.updated |

### Phase 5 — Conformite RGPD

| # | Check | Feature | Type | Dependances | Chemins API | Chemins APP | Notes |
|---|-------|---------|------|-------------|-------------|-------------|-------|
| 23 | [ ] | `rgpd` | parent | aucune | `api/src/core/rgpd/` | `app/src/core/rgpd/` | CookieBanner (header), AcceptLegalPage |
| 24 | [ ] | `rgpd.consentement` | child | rgpd | `api/src/core/rgpd/consentement/` | (dans rgpd/) | Banniere cookies, enregistrement choix |
| 25 | [ ] | `rgpd.registre` | child | rgpd | `api/src/core/rgpd/registre/` | (dans rgpd/) | Registre des traitements (Art. 30) |
| 26 | [ ] | `rgpd.droits` | child | rgpd | `api/src/core/rgpd/droits/` | (dans rgpd/) | Demandes d'exercice de droits |
| 27 | [ ] | `rgpd.export` | child | rgpd | `api/src/core/rgpd/export/` | (dans rgpd/) | Export donnees personnelles (Art. 20) |
| 28 | [ ] | `rgpd.politique` | child | rgpd | `api/src/core/rgpd/politique/` | (dans rgpd/) | Pages legales editables (CGU, confidentialite, mentions) |
| 29 | [ ] | `rgpd.audit` | child | rgpd | `api/src/core/rgpd/audit/` | (dans rgpd/) | Journal d'audit acces donnees perso |

### Phase 6 — Utilitaires & Transversal

| # | Check | Feature | Type | Dependances | Chemins API | Chemins APP | Notes |
|---|-------|---------|------|-------------|-------------|-------------|-------|
| 30 | [ ] | `storybook` | standalone | aucune | `api/src/core/storybook/` | `app/src/core/storybook/` | Catalogue composants UI |
| 31 | [ ] | `realtime` (NEW) | standalone | event | a creer | a creer | Infrastructure SSE/temps reel — les features declarent `depends: ["realtime"]` pour recevoir les updates en direct (permissions, RGPD, etc.) |

---

## Statistiques

- **Total features** : 31 (30 existantes + 1 a creer)
- **Parents** : 9 (_identity, i18n, event, sso, mfa, notification, preference, rgpd, storybook)
- **Sous-features** : 21 (2 sso + 2 mfa + 3 notification + 8 preference + 6 rgpd)
- **Nouvelle feature** : 1 (realtime)
- **Features projet** : 0

---

## Documentation produite

Au fur et a mesure de la revue, les docs sont creees dans :

```
docs/
  core/
    _identity/
      README.md
    i18n/
      README.md
    event/
      README.md
    sso/
      README.md
      github/README.md
      google/README.md
    mfa/
      README.md
      totp/README.md
      email/README.md
    notification/
      README.md
      email/README.md
      push/README.md
      webhook/README.md
    preference/
      README.md
      theme/README.md
      font/README.md
      layout/README.md
      couleur/README.md
      accessibilite/README.md
      composants/README.md
      langue/README.md
      didacticiel/README.md
    rgpd/
      README.md
      consentement/README.md
      registre/README.md
      droits/README.md
      export/README.md
      politique/README.md
      audit/README.md
    storybook/
      README.md
    realtime/
      README.md
```
