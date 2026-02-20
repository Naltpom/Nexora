import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

export const manifest = {
  name: 'preference',
  routes: [
    {
      path: '/profile/preferences',
      component: lazy(() => import('./PreferencePage')),
    },
  ],
  navItems: [],
  featureTutorial: {
    featureName: 'preference',
    label: 'Preferences',
    description: 'Personnalisez votre experience utilisateur.',
    permissionTutorials: [
      {
        permission: 'preference.read',
        label: 'Preferences utilisateur',
        description: 'Decouvrez la page de preferences.',
        steps: [
          {
            target: '.header-theme-toggle',
            title: 'Theme',
            description: 'Basculez entre le theme clair et sombre avec ce bouton.',
            position: 'bottom' as const,
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
