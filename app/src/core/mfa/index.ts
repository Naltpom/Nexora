import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

export const manifest = {
  name: 'mfa',
  routes: [
    {
      path: '/mfa/verify',
      component: lazy(() => import('./MFAVerifyPage')),
      public: true,
    },
    {
      path: '/mfa/force-setup',
      component: lazy(() => import('./MFAForceSetupPage')),
      public: true,
    },
    {
      path: '/profile/mfa',
      component: lazy(() => import('./MFASetupPage')),
      permission: 'mfa.setup',
    },
    {
      path: '/admin/mfa-policy',
      component: lazy(() => import('./MFAAdminPolicy')),
      permission: 'mfa.manage',
    },
  ],
  navItems: [
    { label: 'Securite MFA', path: '/profile/mfa', icon: 'lock', section: 'user', permission: 'mfa.setup', order: 30 },
    { label: 'Politique MFA', path: '/admin/mfa-policy', icon: 'lock-keyhole', section: 'admin', adminGroup: 'securite', permission: 'mfa.manage', order: 20 },
  ],
  featureTutorial: {
    featureName: 'mfa',
    label: 'Authentification multi-facteurs',
    description: 'Securisez votre compte avec la double authentification.',
    permissionTutorials: [
      {
        permission: 'mfa.setup',
        label: 'Configurer la MFA',
        description: 'Activez la double authentification sur votre compte.',
        steps: [
          {
            target: '.mfa-setup-section',
            title: 'Methodes MFA',
            description: 'Choisissez une methode d\'authentification : application TOTP ou email. Vous pouvez activer plusieurs methodes.',
            position: 'top' as const,
            navigateTo: '/profile/mfa',
          },
        ],
      },
      {
        permission: 'mfa.manage',
        label: 'Politique MFA',
        description: 'Definissez les politiques MFA par role.',
        steps: [
          {
            target: '.mfa-policy-table',
            title: 'Politiques par role',
            description: 'Configurez quels roles doivent obligatoirement activer la MFA, les methodes autorisees et le delai de grace.',
            position: 'top' as const,
            navigateTo: '/admin/mfa-policy',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
