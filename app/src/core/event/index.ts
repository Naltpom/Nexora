import { lazy } from 'react'

export const manifest = {
  name: 'event',
  routes: [
    {
      path: '/admin/events',
      component: lazy(() => import('./EventsPage')),
      permission: 'event.read',
    },
    {
      path: '/admin/events/types',
      component: lazy(() => import('./EventTypesPage')),
      permission: 'event.types',
    },
  ],
  navItems: [
    { label: 'Journal', path: '/admin/events', icon: 'zap', section: 'admin', adminGroup: 'securite', permission: 'event.read', order: 10, exact: true },
    { label: 'Types', path: '/admin/events/types', icon: 'list', section: 'admin', adminGroup: 'securite', permission: 'event.types', order: 11 },
  ],
}
