# Roadmap — Features Core à ajouter

## Features core existantes

| Feature | Status |
|---|---|
| `_identity` | ✅ |
| `event` | ✅ |
| `notification` (+email, push, webhook) | ✅ |
| `mfa` (+totp, email) | ✅ |
| `sso` (+google, github) | ✅ |
| `preference` (+theme, couleur, didacticiel, font, layout, composants, accessibilite) | ✅ |
| `rgpd` (+consentement, registre, droits, export, politique, audit) | ✅ |

---

## Phase 2.1 — RGPD & Légal

| Feature | Description | Utilité | Status |
|---|---|---|---|
| `rgpd.consentement` | Bannière cookies + enregistrement des choix de l'utilisateur | **Obligatoire par la loi** — sans ça, risque d'amende CNIL. L'utilisateur doit pouvoir accepter/refuser les cookies par catégorie | ✅ |
| `rgpd.registre` | Registre des traitements de données (Article 30 RGPD) | **Obligatoire** — liste tous les traitements de données : pourquoi on collecte, combien de temps on garde, à qui on transmet | ✅ |
| `rgpd.droits` | Formulaire pour exercer ses droits (accès, suppression, portabilité...) | **Obligatoire** — l'utilisateur doit pouvoir demander à voir ses données, les supprimer, les exporter | ✅ |
| `rgpd.export` | Export de toutes les données personnelles d'un utilisateur (JSON/CSV) | Droit à la portabilité (Article 20) — l'utilisateur télécharge toutes ses données en un clic | ✅ |
| `rgpd.politique` | Pages légales éditables par l'admin (confidentialité, CGU, mentions légales) | **Obligatoire** — toute app doit afficher ses mentions légales et sa politique de confidentialité | ✅ |
| `rgpd.politique` | Acceptation obligatoire des documents légaux (CGU, confidentialité) | L'utilisateur est bloqué sur `/accept-legal` tant qu'il n'a pas accepté la version courante. Mise à jour admin → re-acceptation forcée | ✅ |
| `rgpd.audit` | Journal de qui a consulté quelles données personnelles | Preuve de conformité — si la CNIL demande "qui a accédé aux données de M. Dupont ?", tu as la réponse | ✅ |
| Page `/aide` | Page dédiée avec tutoriels interactifs, stats, permissions | Remplace la section didacticiel des Préférences — aide utilisateur centralisée | ✅ |

## Phase 2.2 — Préférences avancées

| Feature | Description | Utilité | Status |
|---|---|---|---|
| `preference.font` | Choix de la police, échelle de texte (%), interligne, épaisseur | L'utilisateur adapte la lisibilité à sa vue — police plus grande, interligne aéré, police dyslexie | ✅ |
| `preference.layout` | Densité d'affichage, border-radius, largeur du contenu, espacement | Certains préfèrent une UI compacte, d'autres une UI aérée | ✅ |
| `preference.composants` | Style des cards, modals, tables, boutons, séparateurs | L'utilisateur choisit : tables rayées ou non, cards plates ou élevées, modals qui glissent ou apparaissent | ✅ |
| `preference.accessibilite` | Contraste élevé, réduction des animations, police dyslexie, focus visible | Accessibilité — rend l'app utilisable par des personnes malvoyantes, épileptiques, dyslexiques | ✅ |

### Détails phase 2.2 (implémenté v2026.02.25)

#### `preference.font`

**Backend** : stockage dans `User.preferences.font` via `PUT /auth/me/preferences`

**Frontend** : section dans PreferencePage — `app/src/core/preference/font/FontSection.tsx`

| Paramètre | Type | Valeurs | Défaut |
|---|---|---|---|
| Famille de police | select | System, Inter, Roboto, Open Sans, Atkinson Hyperlegible, OpenDyslexic | System |
| Échelle de texte | slider | 85% — 125% (pas de 5%) | 100% |
| Interligne | slider | 1.2 — 2.0 | 1.5 |
| Épaisseur | select | 300 (léger), 400 (normal), 500 (medium) | 400 |

Application : `html font-size: X%` pour l'échelle (propage via `rem` à tous les textes), variables CSS `--font-family`, `--line-height`, `--font-weight`. Pre-render IIFE + AuthContext. Tous les `font-size` SCSS sont en `rem` (180+ déclarations converties).

#### `preference.layout`

**Backend** : stockage dans `User.preferences.layout`

**Frontend** : section dans PreferencePage — `app/src/core/preference/layout/LayoutSection.tsx`

| Paramètre | Type | Valeurs | Défaut |
|---|---|---|---|
| Densité | radio | Compact / Normal / Aéré | Normal |
| Border-radius | slider | 0px — 16px | 8px |
| Largeur max contenu | select | Étroit (720px), Normal (960px), Large (1200px), Pleine largeur | Normal |
| Espacement sections | slider | 8px — 32px | 16px |

Variables CSS : `--density-padding`, `--density-gap`, `--density-row-height`, `--density-card-padding`, `--density-btn-padding`, `--density-input-padding`, `--radius`, `--content-max-width`, `--section-gap`.

Densité = preset qui ajuste padding des cards, gap des grilles, hauteur des lignes de tableau, padding boutons/inputs.

#### `preference.composants`

**Backend** : stockage dans `User.preferences.composants`

**Frontend** : section dans PreferencePage avec prévisualisation — `app/src/core/preference/composants/ComposantsSection.tsx`

| Paramètre | Type | Valeurs | Défaut |
|---|---|---|---|
| Style des cards | radio | Plate / Élevée / Bordée | Élevée |
| Tables rayées | toggle | oui/non | oui |
| Animation des modals | select | Aucune, Fade, Slide-up, Scale | Fade |
| Style des boutons | radio | Arrondi / Carré / Pill | Arrondi |
| Séparateurs de liste | toggle | oui/non | oui |

Application : attributs data sur `<html>` (`data-card-style`, `data-btn-style`, `data-modal-anim`) + classes conditionnelles (`no-table-stripes`, `no-list-separators`).

#### `preference.accessibilite`

**Backend** : stockage dans `User.preferences.accessibilite`

**Frontend** : section dans PreferencePage — `app/src/core/preference/accessibilite/AccessibiliteSection.tsx`

| Paramètre | Type | Effet |
|---|---|---|
| Contraste élevé | toggle | Classe `a11y-high-contrast` — force couleurs WCAG AAA |
| Réduire les animations | toggle | Classe `a11y-reduce-motion` — désactive transitions/animations |
| Police dyslexie | toggle | Classe `a11y-dyslexia` — bascule sur OpenDyslexic |
| Focus visible renforcé | toggle | Classe `a11y-focus-visible` — outline épais sur éléments focusables |
| Liens soulignés | toggle | Classe `a11y-underline-links` — underline forcé sur tous les liens |
| Taille des cibles tactiles | toggle | Classe `a11y-large-targets` — minimum 44×44px |

Classes CSS globales sur `<html>`, styles dans `global.scss`. Respecte `prefers-reduced-motion` et `prefers-contrast` du système par défaut.

## Phase 2.3 — Sécurité & Infrastructure

| Feature | Description | Utilité | Status |
|---|---|---|---|
| `rate_limiter` | Limite le nombre de requêtes par IP/utilisateur/endpoint | Empêche les attaques brute-force, abus d'API, spam | 🔲 |
| `api_key` | Clés d'API pour accès machine-to-machine | Scripts, apps externes ou partenaires utilisent l'API sans login humain | 🔲 |
| `maintenance_mode` | Mode maintenance — page "revenez plus tard" | Mises à jour et migrations sans erreurs visibles | 🔲 |
| `i18n` | Internationalisation — traductions fr/en/etc. | L'app s'affiche dans la langue de l'utilisateur | 🔲 |
| `file_storage` | Upload et stockage de fichiers (local, S3, MinIO) | Avatars, pièces jointes, documents — un seul système réutilisable | 🔲 |
| `audit_log` | Journal d'audit généralisé (qui a fait quoi, quand) | Traçabilité complète, historique lisible par un admin/auditeur | 🔲 |
| `export` | Export générique en CSV, Excel, PDF | Bouton "Exporter" sur n'importe quel tableau de l'app | 🔲 |
| `preference.langue` | Choix de la langue d'affichage | Lié à `i18n` — l'utilisateur choisit sa langue préférée | 🔲 |

## Phase 2.4 — Expérience utilisateur

| Feature | Description | Utilité | Status |
|---|---|---|---|
| `activity_feed` | Flux d'activité — timeline des actions récentes | L'admin voit en temps réel ce qui se passe, l'utilisateur voit son historique | 🔲 |
| `dashboard` | Tableau de bord admin avec métriques | Vue d'ensemble : utilisateurs actifs, notifications, erreurs... | 🔲 |
| `onboarding` | Wizard de première connexion | Choix du thème, langue, visite guidée pour les nouveaux utilisateurs | 🔲 |
| `announcement` | Bannières d'annonces admin → tous les users | Messages importants : maintenance, nouvelles fonctionnalités... | 🔲 |
| `changelog_ui` | Affichage du changelog dans l'app | Bouton "Quoi de neuf ?" — dernières mises à jour dans l'interface | 🔲 |
