import { lazy } from 'react'

export const manifest = {
  name: 'exports',
  routes: [
    {
      path: '/exports',
      component: lazy(() => import('./ExportsPage')),
      permission: 'exports.read',
    },
  ],
  navItems: [
    {
      labelKey: 'exports:nav_title',
      label: 'Exports',
      path: '/exports',
      icon: 'download',
      section: 'sidebar' as const,
      permission: 'exports.read',
      order: 11,
    },
  ],
}
