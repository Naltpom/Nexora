from ..feature_registry import FeatureManifest

manifest = FeatureManifest(
    name="sso",
    label="Single Sign-On (SSO)",
    description="Authentification OAuth2 via fournisseurs externes",
    children=["sso.google", "sso.github"],
    permissions=[
        "sso.link",
    ],
    events=[
        {"event_type": "sso.login", "label": "Connexion SSO", "category": "SSO", "description": "Un utilisateur s'est connecte via SSO"},
        {"event_type": "sso.user_created", "label": "Utilisateur cree via SSO", "category": "SSO", "description": "Un nouvel utilisateur a ete cree lors d'une connexion SSO"},
        {"event_type": "sso.account_linked", "label": "Compte SSO lie", "category": "SSO", "description": "Un compte SSO a ete lie a un utilisateur existant"},
        {"event_type": "sso.account_unlinked", "label": "Compte SSO delie", "category": "SSO", "description": "Un compte SSO a ete delie d'un utilisateur"},
        {"event_type": "sso.link_rejected", "label": "Liaison SSO refusee", "category": "SSO", "description": "Une tentative de liaison SSO a ete refusee (compte deja lie)"},
        {"event_type": "sso.unlink_blocked", "label": "Deliaison SSO bloquee", "category": "SSO", "description": "La deliaison a ete bloquee car c'est le dernier moyen de connexion"},
        {"event_type": "sso.login_failed", "label": "Connexion SSO echouee", "category": "SSO", "description": "Une tentative de connexion SSO a echoue"},
        {"event_type": "sso.link_failed", "label": "Liaison SSO echouee", "category": "SSO", "description": "Une tentative de liaison de compte SSO a echoue"},
    ],
    tutorials=[
        {
            "permission": "sso.link",
            "label": "Lier un compte SSO",
            "description": "Associez vos comptes externes pour vous connecter plus rapidement.",
            "steps": [{"target": ".sso-profile-section", "title": "Comptes lies", "description": "Associez vos comptes Google ou GitHub pour vous connecter plus rapidement. Gerez vos comptes lies depuis cette section.", "position": "top", "navigateTo": "/profile"}],
        },
    ],
    router_module="src.core.sso.routes",
    router_prefix="/api/sso",
    router_tags=["SSO"],
)
