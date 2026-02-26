import { lazy } from 'react'

export const manifest = {
  name: 'preference',
  routes: [
    {
      path: '/profile/preferences',
      component: lazy(() => import('./PreferencePage')),
    },
    {
      path: '/aide',
      component: lazy(() => import('./didacticiel/AidePage')),
      permission: 'preference.didacticiel.read',
    },
  ],
  navItems: [
    { label: 'Preferences', path: '/profile/preferences', icon: 'settings', section: 'user', order: 20 },
    { label: 'Aide', path: '/aide', icon: 'help-circle', section: 'user', permission: 'preference.didacticiel.read', order: 90 },
  ],
}
