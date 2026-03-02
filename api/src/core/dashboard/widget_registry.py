"""Widget registry for dashboard widgets."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class WidgetDefinition:
    id: str
    label: str
    description: str
    category: str  # "stats", "activity", "system", "links", "info"
    required_permission: str | None = None
    feature_gate: str | None = None
    default_size: str = "half"  # "half" or "full"
    data_endpoint: str | None = None


class WidgetRegistry:
    """Singleton registry for dashboard widgets."""

    _instance: WidgetRegistry | None = None

    def __new__(cls) -> WidgetRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._widgets: dict[str, WidgetDefinition] = {}
        return cls._instance

    def register(self, widget: WidgetDefinition) -> None:
        self._widgets[widget.id] = widget

    def get_all(self) -> list[WidgetDefinition]:
        return list(self._widgets.values())

    def get_available(
        self,
        user_perms: dict[str, bool | None],
        active_features: set[str],
    ) -> list[WidgetDefinition]:
        """Return widgets the user can see based on permissions and feature gates."""
        result = []
        for w in self._widgets.values():
            if w.feature_gate and w.feature_gate not in active_features:
                continue
            if w.required_permission:
                granted = user_perms.get(w.required_permission)
                if granted is not True:
                    continue
            result.append(w)
        return result

    def get_by_id(self, widget_id: str) -> WidgetDefinition | None:
        return self._widgets.get(widget_id)


widget_registry = WidgetRegistry()

# Register built-in widgets
_BUILTIN_WIDGETS = [
    WidgetDefinition(
        id="stats_users",
        label="Utilisateurs actifs",
        description="Nombre total d'utilisateurs actifs",
        category="stats",
        required_permission="users.read",
        default_size="half",
        data_endpoint="/api/dashboard/widgets/stats/users",
    ),
    WidgetDefinition(
        id="stats_notifications",
        label="Notifications non lues",
        description="Nombre de notifications non lues",
        category="stats",
        feature_gate="notification",
        default_size="half",
        data_endpoint="/api/dashboard/widgets/stats/notifications",
    ),
    WidgetDefinition(
        id="stats_invitations",
        label="Invitations en attente",
        description="Nombre d'invitations en cours",
        category="stats",
        required_permission="invitations.read",
        default_size="half",
        data_endpoint="/api/dashboard/widgets/stats/invitations",
    ),
    WidgetDefinition(
        id="stats_events",
        label="Evenements recents",
        description="Nombre total d'evenements",
        category="stats",
        required_permission="event.read",
        feature_gate="event",
        default_size="half",
        data_endpoint="/api/dashboard/widgets/stats/events",
    ),
    WidgetDefinition(
        id="activity_feed",
        label="Activite recente",
        description="Flux des derniers evenements systeme",
        category="activity",
        required_permission="event.read",
        feature_gate="event",
        default_size="full",
        data_endpoint="/api/dashboard/widgets/activity",
    ),
    WidgetDefinition(
        id="system_health",
        label="Sante du systeme",
        description="Statut base de donnees, uptime, utilisateurs actifs",
        category="system",
        required_permission="settings.read",
        default_size="full",
        data_endpoint="/api/dashboard/widgets/system-health",
    ),
    WidgetDefinition(
        id="quick_links_user",
        label="Acces rapide utilisateur",
        description="Liens vers le profil, notifications, preferences",
        category="links",
        default_size="half",
    ),
    WidgetDefinition(
        id="quick_links_admin",
        label="Acces rapide admin",
        description="Liens vers la gestion utilisateurs, roles, settings",
        category="links",
        required_permission="users.read",
        default_size="half",
    ),
    WidgetDefinition(
        id="feature_showcase",
        label="Features disponibles",
        description="Grille des features de l'application",
        category="info",
        default_size="full",
    ),
    WidgetDefinition(
        id="welcome_banner",
        label="Banniere de bienvenue",
        description="Message d'accueil pour les nouveaux utilisateurs",
        category="info",
        default_size="full",
    ),
]

for _w in _BUILTIN_WIDGETS:
    widget_registry.register(_w)
