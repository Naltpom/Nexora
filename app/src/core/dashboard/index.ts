import { lazy } from 'react'

export const manifest = {
  name: 'dashboard',
  routes: [
    {
      path: '/dashboard/admin',
      component: lazy(() => import('./DashboardAdmin')),
      permission: 'dashboard.update',
    },
  ],
  navItems: [
    {
      label: 'Tableau de bord',
      path: '/dashboard/admin',
      icon: 'layout-dashboard',
      section: 'admin',
      adminGroup: 'systeme',
      permission: 'dashboard.update',
      order: 5,
    },
  ],
}
