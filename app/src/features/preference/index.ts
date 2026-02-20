import { lazy } from 'react'

export const manifest = {
  name: 'preference',
  routes: [
    {
      path: '/profile/preferences',
      component: lazy(() => import('./PreferencePage')),
    },
  ],
  navItems: [],
}
