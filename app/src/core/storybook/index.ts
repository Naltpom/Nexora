import { lazy } from 'react'

export const manifest = {
  name: 'storybook',
  routes: [
    {
      path: '/admin/storybook',
      component: lazy(() => import('./StorybookPage')),
      permission: 'storybook.read',
    },
  ],
  navItems: [
    {
      label: 'Storybook',
      path: '/admin/storybook',
      icon: 'palette',
      section: 'admin' as const,
      adminGroup: 'systeme' as const,
      permission: 'storybook.read',
      order: 80,
    },
  ],
}
