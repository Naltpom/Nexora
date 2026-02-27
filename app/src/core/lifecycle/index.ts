import { lazy } from 'react'

export const manifest = {
  name: 'lifecycle',
  routes: [
    {
      path: '/admin/lifecycle',
      component: lazy(() => import('./LifecyclePage')),
      permission: 'lifecycle.read',
    },
  ],
  navItems: [
    {
      label: 'Cycle de vie',
      path: '/admin/lifecycle',
      icon: 'clock',
      section: 'admin',
      adminGroup: 'utilisateurs',
      permission: 'lifecycle.read',
      order: 25,
    },
  ],
}
