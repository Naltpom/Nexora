# Idees de features template

Priorite : ⭐ = court terme, 💤 = pas urgent, rien = a decider

## Haute valeur ajoutee

- [ ] ⭐ **audit_log** — Journal d'audit complet (qui a fait quoi, quand, sur quelle entite). Different de `rgpd.audit` qui ne couvre que les acces aux donnees personnelles. Audit trail global : CRUD sur toutes les entites, changements de config, actions admin. Filtrage par user/entite/action, retention configurable.

- [x] ⭐ **file_storage** — Upload et gestion de fichiers (avatars, documents, pieces jointes). Abstraction storage (local/S3/MinIO), preview, quotas par user, virus scan optionnel. Reutilisable par toutes les features projet.

- [ ] **api_keys** — Gestion de cles API personnelles pour acces programmatique. Creation, revocation, scopes/permissions, rate limiting par cle. Permet aux users d'integrer l'app avec des outils externes.

- [-] **dashboard** — Tableau de bord admin avec widgets configurables (stats users, activite recente, sante systeme, graphiques). Bonne landing page apres login. Widgets drag & drop, personnalisation par role.

- [ ] **task_queue** — File de taches asynchrones (emails en masse, exports lourds, nettoyage). Formaliser ARQ en feature avec UI de monitoring : jobs en cours, historique, retry manuel, logs.


---

## Valeur moyenne — Differenciation

- [x] ⭐ **comments** — Systeme de commentaires/notes generique attachable a n'importe quelle entite. Mentions (@user), edition, suppression. Reutilisable par les features projet.

- [ ] **tags** — Systeme de tags/labels generique (polymorphique). Couleurs, categories, filtrage. Applicable a users, entites custom, etc.

- [-] ⭐ **search** — Recherche full-text globale (PostgreSQL `tsvector` ou Meilisearch). Chaque feature enregistre ses entites cherchables. Plus puissant que le global_search actuel dans _identity.

- [ ] ⭐ **import_export** — Import/export CSV/Excel generique pour les entites. Mapping de colonnes, validation, preview avant import, historique des imports.

- [ ] **scheduler** — Planification de taches recurrentes avec UI admin (cron jobs visuels). Lie a task_queue pour l'execution. Interface calendrier, logs d'execution.

---

## Nice to have

- [x] ⭐ **announcement** — Bannieres d'annonces systeme (maintenance, nouvelles features). Ciblage par role, dates d'affichage, dismissable. 

- [ ] **activity_feed** — Flux d'activite social (timeline des actions recentes). Construit sur le systeme d'events existant. Filtrable par type/user.

- [ ] **template_email** — Editeur de templates email WYSIWYG dans l'admin. Variables dynamiques, preview, versioning des templates.

- [ ] **reporting** — Generation de rapports (PDF/Excel) avec templates configurables. Planification automatique (quotidien/hebdo/mensuel).

- [-] **feature_flags** — Feature flags avances (pourcentage de rollout, ciblage par role/user, A/B testing). Extension du toggle on/off existant.

- [-] **maintenance_mode** — Mode maintenance avec page dediee, bypass pour admins, planification automatique.

- [ ] **webhook_inbound** — Reception de webhooks entrants (complementaire a notification.webhook qui est sortant). Signature verification, routing, retry.

- [x] ⭐ **favorites** — Systeme de favoris generique (etoile). Bouton favori a cote de la cloche de notifications dans la navbar. Chaque page peut etre ajoutee en favori (icone, label, URL courante). Les filtres actifs (tableaux, recherche) sont captures dans l'URL et sauvegardes avec le favori. Panel/dropdown de favoris pour acces rapide. Backend : table polymorphique `favorites` (user_id, label, icon, url, position).

