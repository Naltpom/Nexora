import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

export const manifest = {
  name: 'event',
  routes: [
    {
      path: '/admin/events',
      component: lazy(() => import('./EventsPage')),
      permission: 'event.read',
    },
  ],
  navItems: [
    { label: 'Events', path: '/admin/events', icon: 'zap', section: 'admin', adminGroup: 'securite', permission: 'event.read', order: 10 },
  ],
  featureTutorial: {
    featureName: 'event',
    label: 'Evenements',
    description: 'Consultez le journal des evenements du systeme.',
    permissionTutorials: [
      {
        permission: 'event.read',
        label: 'Consulter les evenements',
        description: 'Decouvrez le journal des evenements systeme.',
        steps: [
          {
            target: '.page-header-card',
            title: 'Catalogue d\'evenements',
            description: 'Consultez les types d\'evenements declares par les features actives : connexions, modifications, erreurs, etc.',
            position: 'bottom' as const,
            navigateTo: '/admin/events',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
