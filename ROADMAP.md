# Roadmap — Features Core à ajouter

## Features core existantes

| Feature | Status |
|---|---|
| `_identity` | ✅ |
| `event` | ✅ |
| `notification` (+email, push, webhook) | ✅ |
| `mfa` (+totp, email) | ✅ |
| `sso` (+google, github) | ✅ |
| `preference` (+theme, couleur, didacticiel) | ✅ |
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
| `rgpd.audit` | Journal de qui a consulté quelles données personnelles | Preuve de conformité — si la CNIL demande "qui a accédé aux données de M. Dupont ?", tu as la réponse | ✅ |

## Phase 2.2 — Préférences avancées

| Feature | Description | Utilité | Status |
|---|---|---|---|
| `preference.font` | Choix de la police, taille du texte, interligne | L'utilisateur adapte la lisibilité à sa vue — police plus grande, interligne aéré, police dyslexie... | 🔲 |
| `preference.layout` | Densité d'affichage, border-radius, largeur du contenu | Certains préfèrent une UI compacte, d'autres une UI aérée | 🔲 |
| `preference.composants` | Style des cards, modals, tables, boutons | L'utilisateur choisit : tables rayées ou non, cards plates ou élevées, modals qui glissent ou apparaissent... | 🔲 |
| `preference.accessibilite` | Contraste élevé, réduction des animations, police dyslexie | Accessibilité — rend l'app utilisable par des personnes malvoyantes, épileptiques, dyslexiques | 🔲 |

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
