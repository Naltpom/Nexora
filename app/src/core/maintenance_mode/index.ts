import { lazy } from 'react'

export const manifest = {
  name: 'maintenance_mode',
  routes: [
    {
      path: '/admin/maintenance',
      component: lazy(() => import('./MaintenanceAdmin')),
      permission: 'maintenance_mode.manage',
    },
  ],
  navItems: [
    {
      label: 'Maintenance',
      path: '/admin/maintenance',
      icon: 'wrench',
      section: 'admin',
      adminGroup: 'systeme',
      permission: 'maintenance_mode.manage',
      order: 25,
    },
  ],
}
