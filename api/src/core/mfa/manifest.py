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
