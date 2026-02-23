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
    {
      path: '/admin/events/types',
      component: lazy(() => import('./EventTypesPage')),
      permission: 'event.types',
    },
  ],
  navItems: [
    { label: 'Journal', path: '/admin/events', icon: 'zap', section: 'admin', adminGroup: 'securite', permission: 'event.read', order: 10, exact: true },
    { label: 'Types', path: '/admin/events/types', icon: 'list', section: 'admin', adminGroup: 'securite', permission: 'event.types', order: 11 },
  ],
  featureTutorial: {
    featureName: 'event',
    label: 'Evenements',
    description: 'Consultez le journal des evenements du systeme.',
    permissionTutorials: [
      {
        permission: 'event.read',
        label: 'Journal des evenements',
        description: 'Consultez les evenements enregistres dans le systeme.',
        steps: [
          {
            target: '.page-header-card',
            title: 'Journal des evenements',
            description: 'Consultez les evenements recus : connexions, modifications, actions des utilisateurs.',
            position: 'bottom' as const,
            navigateTo: '/admin/events',
          },
        ],
      },
      {
        permission: 'event.types',
        label: 'Catalogue des types',
        description: 'Decouvrez les types d\'evenements declares par les features actives.',
        steps: [
          {
            target: '.page-header-card',
            title: 'Catalogue d\'evenements',
            description: 'Consultez les types d\'evenements declares par les features actives.',
            position: 'bottom' as const,
            navigateTo: '/admin/events/types',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
