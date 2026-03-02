import { lazy } from 'react'

export const manifest = {
  name: 'feature_flags',
  routes: [
    {
      path: '/admin/feature-flags',
      component: lazy(() => import('./FeatureFlagsAdmin')),
      permission: 'feature_flags.manage',
    },
  ],
  navItems: [
    {
      label: 'Feature Flags',
      path: '/admin/feature-flags',
      icon: 'flag',
      section: 'admin',
      adminGroup: 'systeme',
      permission: 'feature_flags.manage',
      order: 15,
    },
  ],
}
