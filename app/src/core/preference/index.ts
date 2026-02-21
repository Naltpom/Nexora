import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

export const manifest = {
  name: 'preference',
  routes: [
    {
      path: '/profile/preferences',
      component: lazy(() => import('./PreferencePage')),
    },
    {
      path: '/aide',
      component: lazy(() => import('./didacticiel/AidePage')),
      permission: 'preference.didacticiel.read',
    },
  ],
  navItems: [
    { label: 'Preferences', path: '/profile/preferences', icon: 'settings', section: 'user', order: 20 },
    { label: 'Aide', path: '/aide', icon: 'help-circle', section: 'user', permission: 'preference.didacticiel.read', order: 90 },
  ],
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
