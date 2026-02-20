import { lazy } from 'react'

export const manifest = {
  name: 'event',
  routes: [
    {
      path: '/admin/events',
      component: lazy(() => import('./EventsPage')),
      permission: 'event.read',
    },
  ],
  navItems: [],
}
