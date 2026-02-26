import { lazy } from 'react'

export const manifest = {
  name: 'notification',
  routes: [
    { path: '/notifications', component: lazy(() => import('./NotificationList')), permission: 'notification.read' },
    { path: '/notifications/settings', component: lazy(() => import('./NotificationSettings')), permission: 'notification.read' },
    { path: '/notifications/redirect/:token', component: lazy(() => import('./NotificationRedirect')) },
  ],
  navItems: [
    { label: 'Notifications', path: '/notifications', icon: 'bell', section: 'user', permission: 'notification.read', order: 40 },
    { label: 'Notifications', path: '/notifications/settings', icon: 'bell', section: 'admin', adminGroup: 'systeme', permission: 'notification.read', order: 15 },
  ],
  headerComponents: [lazy(() => import('./NotificationBell'))],
}
