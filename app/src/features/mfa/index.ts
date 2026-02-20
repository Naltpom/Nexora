import { lazy } from 'react'

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
  navItems: [],
}
