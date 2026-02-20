# event — Changelog

## 2026.02.9

- Page admin frontend "Catalogue d'evenements" groupee par feature avec recherche
- Lien "Events" dans le menu admin du Header

## 2026.02.8 — Init

- Feature event : bus d'evenements generique avec persistence
- Model `Event` (deplace depuis notification)
- Service `persist_event` pour la sauvegarde des evenements applicatifs
- Event handler wildcard : persiste les events puis re-emet `event.persisted` pour les features downstream
- Endpoint `GET /api/events/event-types` : liste dynamique des types d'events depuis les manifests
- Declaration des evenements dans `FeatureManifest.events` pour la decouverte inter-features
