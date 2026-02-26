from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="mfa",
    label="Authentification Multi-Facteurs (MFA)",
    description="Gestion et application de l'authentification multi-facteurs",
    children=["mfa.totp", "mfa.email"],
    permissions=[
        "mfa.manage",
        "mfa.setup",
        "mfa.bypass",
    ],
    events=[
        {"event_type": "mfa.verify_failed", "label": "Verification MFA echouee", "category": "MFA", "description": "Un code MFA invalide a ete soumis"},
        {"event_type": "mfa.verified", "label": "Verification MFA reussie", "category": "MFA", "description": "Un code MFA a ete verifie avec succes"},
        {"event_type": "mfa.disabled", "label": "MFA desactive", "category": "MFA", "description": "Toutes les methodes MFA ont ete desactivees"},
        {"event_type": "mfa.backup_codes_generated", "label": "Codes de secours generes", "category": "MFA", "description": "De nouveaux codes de secours MFA ont ete generes"},
        {"event_type": "mfa.backup_code_used", "label": "Code de secours utilise", "category": "MFA", "description": "Un code de secours MFA a ete utilise"},
        {"event_type": "mfa.bypassed", "label": "MFA contourne", "category": "MFA", "description": "Le MFA a ete contourne via une permission de bypass"},
        {"event_type": "mfa.policy_updated", "label": "Politique MFA modifiee", "category": "MFA", "description": "Une politique MFA de role a ete mise a jour"},
        {"event_type": "mfa.policy_deleted", "label": "Politique MFA supprimee", "category": "MFA", "description": "Une politique MFA de role a ete supprimee"},
    ],
    tutorials=[
        {
            "permission": "mfa.setup",
            "label": "Configurer la MFA",
            "description": "Activez la double authentification sur votre compte.",
            "steps": [{"target": ".mfa-setup-section", "title": "Methodes MFA", "description": "Choisissez une methode d'authentification : application TOTP ou email. Vous pouvez activer plusieurs methodes.", "position": "top", "navigateTo": "/profile/mfa"}],
        },
        {
            "permission": "mfa.manage",
            "label": "Politique MFA",
            "description": "Definissez les politiques MFA par role.",
            "steps": [{"target": ".mfa-policy-table", "title": "Politiques par role", "description": "Configurez quels roles doivent obligatoirement activer la MFA, les methodes autorisees et le delai de grace.", "position": "top", "navigateTo": "/admin/mfa-policy"}],
        },
    ],
    router_module="src.core.mfa.routes",
    router_prefix="/api/mfa",
    router_tags=["MFA"],
)
