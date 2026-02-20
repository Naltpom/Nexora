import { lazy } from 'react'
import type { TutorialDefinition } from '../../types'

export const manifest = {
  name: 'notification',
  routes: [
    { path: '/notifications', component: lazy(() => import('./NotificationList')), permission: 'notification.read' },
    { path: '/notifications/settings', component: lazy(() => import('./NotificationSettings')), permission: 'notification.read' },
    { path: '/notifications/redirect/:token', component: lazy(() => import('./NotificationRedirect')) },
  ],
  navItems: [
    { label: 'Notifications', path: '/notifications', icon: 'bell' },
  ],
  headerComponents: [lazy(() => import('./NotificationBell'))],
  tutorials: [
    {
      id: 'notification.overview',
      label: 'Decouvrir les notifications',
      description: 'Apprenez a utiliser le systeme de notifications.',
      permission: 'notification.read',
      triggerPath: '/notifications',
      steps: [
        {
          target: '.notification-bell-btn',
          title: 'Cloche de notifications',
          description: 'Cliquez ici pour voir vos notifications recentes sans quitter la page courante.',
          position: 'bottom',
        },
        {
          target: '.notification-dropdown-footer a[href="/notifications/settings"]',
          title: 'Parametres',
          description: 'Configurez vos preferences de notification : email, push, webhooks.',
          position: 'bottom',
        },
      ],
    },
  ] satisfies TutorialDefinition[],
}
