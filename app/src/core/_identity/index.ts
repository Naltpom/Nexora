import type { FeatureTutorial } from '../../types'

export const manifest = {
  name: '_identity',
  navItems: [
    { label: 'Mon profil', path: '/profile', icon: 'user', section: 'user', order: 10 },
    { label: 'Utilisateurs', path: '/admin/users', icon: 'users', section: 'admin', adminGroup: 'gestion', permission: 'users.read', order: 10 },
    { label: 'Roles', path: '/admin/roles', icon: 'shield', section: 'admin', adminGroup: 'gestion', permission: 'roles.read', order: 20 },
    { label: 'Permissions', path: '/admin/permissions', icon: 'lock', section: 'admin', adminGroup: 'gestion', permission: 'permissions.read', order: 30 },
    { label: 'Features', path: '/admin/features', icon: 'grid', section: 'admin', adminGroup: 'systeme', permission: 'features.read', order: 10 },
    { label: 'Parametres', path: '/admin/settings', icon: 'sliders', section: 'admin', adminGroup: 'systeme', permission: 'settings.read', order: 20 },
    { label: 'Base de donnees', path: '/admin/database', icon: 'database', section: 'admin', adminGroup: 'systeme', permission: 'backups.read', order: 30 },
    { label: 'Commandes', path: '/admin/commands', icon: 'terminal', section: 'admin', adminGroup: 'systeme', permission: 'commands.read', order: 40 },
  ],
  featureTutorial: {
    featureName: '_identity',
    label: 'Administration',
    description: 'Decouvrez les outils d\'administration : utilisateurs, roles, features et parametres.',
    permissionTutorials: [
      {
        permission: 'search.global',
        label: 'Recherche globale',
        description: 'Trouvez rapidement utilisateurs, roles et parametres depuis la barre de recherche.',
        steps: [
          {
            target: '.global-search-container',
            title: 'Recherche globale',
            description: 'Utilisez cette barre de recherche pour trouver rapidement des utilisateurs, roles ou parametres.',
            position: 'bottom' as const,
          },
        ],
      },
      {
        permission: 'users.read',
        label: 'Consulter les utilisateurs',
        description: 'Consultez la liste des utilisateurs, leur statut et leur derniere connexion.',
        steps: [
          {
            target: '.unified-search-box',
            title: 'Recherche d\'utilisateurs',
            description: 'Filtrez la liste des utilisateurs par email, nom ou prenom.',
            position: 'bottom' as const,
            navigateTo: '/admin/users?tab=users',
          },
          {
            target: '.unified-table',
            title: 'Liste des utilisateurs',
            description: 'Consultez tous les utilisateurs, leur statut et leur derniere connexion. Cliquez sur un utilisateur pour voir ses details.',
            position: 'top' as const,
            navigateTo: '/admin/users?tab=users',
          },
        ],
      },
      {
        permission: 'users.create',
        label: 'Creer un utilisateur',
        description: 'Ajoutez de nouveaux utilisateurs au systeme.',
        steps: [
          {
            target: '.btn-unified-primary',
            title: 'Creer un utilisateur',
            description: 'Cliquez ici pour ajouter un nouvel utilisateur au systeme.',
            position: 'bottom' as const,
            navigateTo: '/admin/users?tab=users',
          },
        ],
      },
      {
        permission: 'roles.read',
        label: 'Consulter les roles',
        description: 'Consultez les roles existants et leurs permissions associees.',
        steps: [
          {
            target: '.unified-table',
            title: 'Liste des roles',
            description: 'Consultez les roles existants et leurs permissions associees. Cliquez sur le badge de permissions pour voir les details.',
            position: 'top' as const,
            navigateTo: '/admin/roles',
          },
        ],
      },
      {
        permission: 'roles.create',
        label: 'Creer un role',
        description: 'Creez de nouveaux roles avec des permissions personnalisees.',
        steps: [
          {
            target: '.btn-unified-primary',
            title: 'Creer un role',
            description: 'Cliquez ici pour creer un nouveau role avec des permissions personnalisees.',
            position: 'bottom' as const,
            navigateTo: '/admin/roles',
          },
        ],
      },
      {
        permission: 'features.read',
        label: 'Gerer les features',
        description: 'Activez ou desactivez les modules de l\'application.',
        steps: [
          {
            target: '.input-search-wide',
            title: 'Recherche de features',
            description: 'Recherchez des features par nom ou description.',
            position: 'bottom' as const,
            navigateTo: '/admin/features',
          },
          {
            target: '.unified-table',
            title: 'Liste des features',
            description: 'Activez ou desactivez les features avec les toggles. Les features enfants dependent de leur parent.',
            position: 'top' as const,
            navigateTo: '/admin/features',
          },
        ],
      },
      {
        permission: 'settings.read',
        label: 'Parametres applicatifs',
        description: 'Configurez le nom, la description, le logo et les couleurs de l\'application.',
        steps: [
          {
            target: '.settings-grid',
            title: 'Parametres de l\'application',
            description: 'Configurez le nom, la description, le logo et les couleurs de votre application.',
            position: 'top' as const,
            navigateTo: '/admin/settings',
          },
        ],
      },
      {
        permission: 'impersonation.start',
        label: 'Impersonation',
        description: 'Connectez-vous en tant qu\'un autre utilisateur pour diagnostiquer des problemes.',
        steps: [
          {
            target: '.impersonate-btn',
            title: 'Impersonation',
            description: 'Cliquez sur ce bouton pour vous connecter en tant que cet utilisateur. Utile pour diagnostiquer des problemes.',
            position: 'left' as const,
            navigateTo: '/admin/users',
          },
        ],
      },
      {
        permission: 'users.update',
        label: 'Modifier un utilisateur',
        description: 'Modifiez les informations, roles et permissions d\'un utilisateur.',
        steps: [
          {
            target: '.unified-table tbody tr',
            title: 'Details utilisateur',
            description: 'Cliquez sur un utilisateur pour acceder a sa fiche et modifier ses informations, roles ou permissions.',
            position: 'top' as const,
            navigateTo: '/admin/users',
          },
        ],
      },
      {
        permission: 'users.delete',
        label: 'Supprimer un utilisateur',
        description: 'Supprimez un utilisateur du systeme.',
        steps: [
          {
            target: '.btn-icon-danger',
            title: 'Supprimer',
            description: 'Cliquez sur l\'icone de suppression pour retirer un utilisateur. Cette action est irreversible.',
            position: 'left' as const,
            navigateTo: '/admin/users',
          },
        ],
      },
      {
        permission: 'roles.update',
        label: 'Modifier un role',
        description: 'Modifiez le nom, la description ou les permissions d\'un role existant.',
        steps: [
          {
            target: '.unified-table',
            title: 'Modifier un role',
            description: 'Utilisez les icones de modification dans le tableau pour editer le nom, la description et les permissions d\'un role.',
            position: 'top' as const,
            navigateTo: '/admin/roles',
          },
        ],
      },
      {
        permission: 'roles.delete',
        label: 'Supprimer un role',
        description: 'Supprimez un role qui n\'est plus necessaire.',
        steps: [
          {
            target: '.unified-table',
            title: 'Supprimer un role',
            description: 'Utilisez l\'icone de suppression dans le tableau pour retirer un role. Les utilisateurs associes perdront ses permissions.',
            position: 'top' as const,
            navigateTo: '/admin/roles',
          },
        ],
      },
      {
        permission: 'permissions.read',
        label: 'Consulter les permissions',
        description: 'Consultez la liste des permissions disponibles et leur etat.',
        steps: [
          {
            target: '.unified-table',
            title: 'Liste des permissions',
            description: 'Consultez toutes les permissions du systeme, groupees par feature. Chaque permission peut etre activee ou desactivee.',
            position: 'top' as const,
            navigateTo: '/admin/permissions',
          },
        ],
      },
      {
        permission: 'permissions.manage',
        label: 'Gerer les permissions',
        description: 'Activez ou desactivez les permissions et configurez les acces.',
        steps: [
          {
            target: '.toggle-switch',
            title: 'Activer/desactiver',
            description: 'Utilisez les toggles pour activer ou desactiver des permissions individuelles.',
            position: 'left' as const,
            navigateTo: '/admin/permissions',
          },
        ],
      },
      {
        permission: 'invitations.read',
        label: 'Consulter les invitations',
        description: 'Consultez les invitations envoyees et leur statut.',
        steps: [
          {
            target: '.invitations-table',
            title: 'Liste des invitations',
            description: 'Retrouvez ici toutes les invitations envoyees, leur statut (en attente, expiree) et la date d\'envoi.',
            position: 'top' as const,
            navigateTo: '/admin/users?tab=invitations',
          },
        ],
      },
      {
        permission: 'invitations.create',
        label: 'Envoyer une invitation',
        description: 'Invitez de nouveaux utilisateurs par email.',
        steps: [
          {
            target: '.btn-unified-primary',
            title: 'Inviter un utilisateur',
            description: 'Cliquez ici pour envoyer une invitation par email. L\'utilisateur recevra un lien pour creer son compte.',
            position: 'bottom' as const,
            navigateTo: '/admin/users?tab=invitations',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
