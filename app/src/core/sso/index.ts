import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

export const manifest = {
  name: 'sso',
  routes: [
    {
      path: '/sso/callback/:provider',
      component: lazy(() => import('./SSOCallbackPage')),
      public: true,
    },
  ],
  featureTutorial: {
    featureName: 'sso',
    label: 'Connexion SSO',
    description: 'Liez vos comptes Google ou GitHub pour une connexion simplifiee.',
    permissionTutorials: [
      {
        permission: 'sso.link',
        label: 'Lier un compte SSO',
        description: 'Associez vos comptes externes pour vous connecter plus rapidement.',
        steps: [
          {
            target: '.sso-profile-section',
            title: 'Comptes lies',
            description: 'Associez vos comptes Google ou GitHub pour vous connecter plus rapidement. Gerez vos comptes lies depuis cette section.',
            position: 'top' as const,
            navigateTo: '/profile',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
