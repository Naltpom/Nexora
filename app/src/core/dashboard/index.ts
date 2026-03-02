import { lazy } from 'react'

export const manifest = {
  name: 'dashboard',
  routes: [
    {
      path: '/dashboard/admin',
      component: lazy(() => import('./DashboardAdmin')),
      permission: 'dashboard.manage',
    },
  ],
  navItems: [
    {
      label: 'Tableau de bord',
      path: '/dashboard/admin',
      icon: 'layout-dashboard',
      section: 'admin',
      adminGroup: 'systeme',
      permission: 'dashboard.manage',
      order: 5,
    },
  ],
}
