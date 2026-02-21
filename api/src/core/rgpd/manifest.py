from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="rgpd",
    label="RGPD & Conformite",
    description="Gestion de la conformite RGPD : consentement, droits, export, pages legales, audit",
    version="2026.02.26",
    children=[
        "rgpd.consentement",
        "rgpd.registre",
        "rgpd.droits",
        "rgpd.export",
        "rgpd.politique",
        "rgpd.audit",
    ],
    permissions=[
        "rgpd.read",
        "rgpd.consentement.read",
        "rgpd.consentement.manage",
        "rgpd.registre.read",
        "rgpd.registre.manage",
        "rgpd.droits.read",
        "rgpd.droits.manage",
        "rgpd.export.read",
        "rgpd.politique.read",
        "rgpd.politique.manage",
        "rgpd.audit.read",
    ],
    events=[
        {
            "event_type": "rgpd.consent_updated",
            "label": "Consentement mis a jour",
            "category": "RGPD",
            "description": "Un utilisateur a mis a jour ses preferences de consentement",
        },
        {
            "event_type": "rgpd.rights_request_created",
            "label": "Demande de droits creee",
            "category": "RGPD",
            "description": "Un utilisateur a soumis une demande d'exercice de droits",
        },
        {
            "event_type": "rgpd.rights_request_processed",
            "label": "Demande de droits traitee",
            "category": "RGPD",
            "description": "Un administrateur a traite une demande d'exercice de droits",
        },
        {
            "event_type": "rgpd.data_exported",
            "label": "Donnees exportees",
            "category": "RGPD",
            "description": "Un utilisateur a exporte ses donnees personnelles",
        },
    ],
    extra_routers=[
        {"module": "src.core.rgpd.routes_consent", "prefix": "/api/rgpd/consent", "tags": ["RGPD - Consentement"]},
        {"module": "src.core.rgpd.routes_registre", "prefix": "/api/rgpd/register", "tags": ["RGPD - Registre"]},
        {"module": "src.core.rgpd.routes_droits", "prefix": "/api/rgpd/rights", "tags": ["RGPD - Droits"]},
        {"module": "src.core.rgpd.routes_export", "prefix": "/api/rgpd/export", "tags": ["RGPD - Export"]},
        {"module": "src.core.rgpd.routes_politique", "prefix": "/api/rgpd/legal", "tags": ["RGPD - Pages legales"]},
        {"module": "src.core.rgpd.routes_audit", "prefix": "/api/rgpd/audit", "tags": ["RGPD - Audit"]},
    ],
)
