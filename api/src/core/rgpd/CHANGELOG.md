# Changelog — rgpd

## 2026.02.24

### Ameliorations AcceptLegalPage

- Deux modes d'affichage : pas-a-pas (comptes existants) et compact (inscription)
- Scroll-to-bottom obligatoire avant de pouvoir cocher "J'ai lu et j'accepte"
- Detection compte existant via anciennete (> 5 min) ou acceptations precedentes
- Reset du scroll entre documents en mode pas-a-pas
- Blocage du tutoriel et de la notification sur `/accept-legal` et `/change-password`

## 2026.02.23

### Acceptation obligatoire des documents legaux

- Champ `requires_acceptance` sur `LegalPage` : marquer un document comme obligatoire
- Table `legal_page_versions` : archivage automatique du contenu avant chaque modification
- Table `legal_page_acceptances` : tracking user/page/version avec IP et user-agent
- Endpoints : `GET /acceptance/pending`, `GET /acceptance/check`, `POST /acceptance/accept`, `GET /{slug}/versions`
- Inclusion de `pending_legal_acceptances` dans `/auth/me`
- Guard `ProtectedRoute` : redirection vers `/accept-legal` si documents en attente
- `AcceptLegalPage` : affichage des documents, checkboxes, refus, suppression compte
- Admin : toggle obligatoire, historique versions, warning modification
- Seed : `terms` et `privacy-policy` marques `requires_acceptance = true`
- Endpoint `DELETE /auth/me/account` : soft delete self-service (30 jours reactivation)
- Reactivation automatique dans `authenticate_user` si compte soft-deleted < 30 jours

## 2026.02.21

### Enforcement consentement + wording CNIL

- Nouveau module `consentManager.ts` pour verifier et appliquer le consentement cote client
- Guard `hasConsent('functional')` dans `main.tsx` (pre-render) et `AuthContext.tsx` (get/setLocalPreferences)
- Nettoyage automatique des cles localStorage/sessionStorage fonctionnelles lors de la revocation
- Wording "cookies" → "cookies et traceurs" : CookieBanner, ConsentPage, MyDataPage, LegalPage, index.ts

## 2026.02.20

### Creation de la feature RGPD & Conformite

- Feature parent `rgpd` avec 6 sous-features : consentement, registre, droits, export, politique, audit
- 5 tables : `consent_records`, `data_processing_register`, `rights_requests`, `data_access_logs`, `legal_pages`
- Banniere de consentement cookies (anonymous + authenticated)
- Registre des traitements Article 30 (CRUD admin)
- Exercice des droits RGPD (demandes user + traitement admin)
- Export des donnees personnelles en JSON/CSV (Article 20 portabilite)
- Pages legales editables (confidentialite, CGU, mentions legales, cookies)
- Journal d'audit des acces aux donnees personnelles
- Commandes de purge : audit logs > 365j, consentements > 3 ans
