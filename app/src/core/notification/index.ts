import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

export const manifest = {
  name: 'notification',
  routes: [
    { path: '/notifications', component: lazy(() => import('./NotificationList')), permission: 'notification.read' },
    { path: '/notifications/settings', component: lazy(() => import('./NotificationSettings')), permission: 'notification.read' },
    { path: '/notifications/redirect/:token', component: lazy(() => import('./NotificationRedirect')) },
  ],
  navItems: [
    { label: 'Notifications', path: '/notifications', icon: 'bell', section: 'user', permission: 'notification.read', order: 40 },
    { label: 'Notifications', path: '/notifications/settings', icon: 'bell', section: 'admin', adminGroup: 'systeme', permission: 'notification.read', order: 15 },
  ],
  headerComponents: [lazy(() => import('./NotificationBell'))],
  featureTutorial: {
    featureName: 'notification',
    label: 'Notifications',
    description: 'Decouvrez le systeme de notifications, regles et parametres.',
    permissionTutorials: [
      {
        permission: 'notification.read',
        label: 'Consulter les notifications',
        description: 'Apprenez a consulter et gerer vos notifications.',
        steps: [
          {
            target: '.notification-bell-btn',
            title: 'Cloche de notifications',
            description: 'Cliquez ici pour voir vos notifications recentes sans quitter la page courante.',
            position: 'bottom' as const,
          },
          {
            target: '.unified-page-header',
            title: 'Page des notifications',
            description: 'Retrouvez ici l\'historique complet de vos notifications. Marquez-les comme lues ou supprimez-les.',
            position: 'bottom' as const,
            navigateTo: '/notifications',
          },
        ],
      },
      {
        permission: 'notification.rules.read',
        label: 'Regles de notification',
        description: 'Decouvrez comment configurer des regles.',
        steps: [
          {
            target: '.notif-tab',
            title: 'Onglets',
            description: 'Basculez entre la gestion des regles et des webhooks.',
            position: 'bottom' as const,
            navigateTo: '/notifications/settings',
          },
          {
            target: '.notif-rules-table',
            title: 'Liste des regles',
            description: 'Visualisez vos regles de notification : evenements surveilles, canaux actifs et etat.',
            position: 'top' as const,
            navigateTo: '/notifications/settings',
          },
        ],
      },
      {
        permission: 'notification.rules.create',
        label: 'Creer une regle',
        description: 'Creez des regles personnalisees de notification.',
        steps: [
          {
            target: '.notif-section-header .btn-primary',
            title: 'Creer une regle',
            description: 'Cliquez ici pour creer une nouvelle regle de notification avec des evenements et canaux personnalises.',
            position: 'bottom' as const,
            navigateTo: '/notifications/settings',
          },
        ],
      },
      {
        permission: 'notification.webhook.create',
        label: 'Creer un webhook',
        description: 'Configurez des webhooks pour recevoir des notifications HTTP.',
        steps: [
          {
            target: '.notif-section-header .btn-primary',
            title: 'Ajouter un webhook',
            description: 'Cliquez ici pour creer un nouveau webhook. Choisissez le format (custom, Slack, Discord) et configurez l\'URL.',
            position: 'bottom' as const,
            navigateTo: '/notifications/settings?tab=webhooks',
          },
        ],
      },
      {
        permission: 'notification.webhook.read',
        label: 'Configurer des webhooks',
        description: 'Consultez et gerez vos webhooks de notification.',
        steps: [
          {
            target: '.notif-section',
            title: 'Vos webhooks',
            description: 'Retrouvez ici la liste de vos webhooks personnels et globaux. Testez, modifiez ou supprimez-les.',
            position: 'top' as const,
            navigateTo: '/notifications/settings?tab=webhooks',
          },
        ],
      },
      {
        permission: 'notification.admin',
        label: 'Administration des notifications',
        description: 'Gerez les regles globales et parametres admin.',
        steps: [
          {
            target: '.notif-section',
            title: 'Section administration',
            description: 'En tant qu\'admin, vous pouvez gerer les regles globales qui s\'appliquent a tous les utilisateurs.',
            position: 'top' as const,
            navigateTo: '/notifications/settings',
          },
        ],
      },
      {
        permission: 'notification.rules.update',
        label: 'Modifier une regle',
        description: 'Modifiez les parametres d\'une regle de notification existante.',
        steps: [
          {
            target: '.btn-icon-secondary',
            title: 'Modifier',
            description: 'Cliquez sur l\'icone de modification pour editer les evenements, canaux et parametres d\'une regle.',
            position: 'left' as const,
            navigateTo: '/notifications/settings',
          },
        ],
      },
      {
        permission: 'notification.rules.delete',
        label: 'Supprimer une regle',
        description: 'Supprimez une regle de notification que vous ne souhaitez plus.',
        steps: [
          {
            target: '.btn-icon-danger',
            title: 'Supprimer',
            description: 'Cliquez sur l\'icone de suppression pour retirer une regle. Cette action est irreversible.',
            position: 'left' as const,
            navigateTo: '/notifications/settings',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
