import { lazy } from 'react'

export const manifest = {
  name: 'announcement',
  routes: [
    {
      path: '/admin/announcements',
      component: lazy(() => import('./AnnouncementAdmin')),
      permission: 'announcement.manage',
    },
    {
      path: '/announcements',
      component: lazy(() => import('./AnnouncementsPage')),
      permission: 'announcement.read',
    },
  ],
  navItems: [
    {
      label: 'Annonces',
      path: '/admin/announcements',
      icon: 'megaphone',
      section: 'admin',
      adminGroup: 'systeme',
      permission: 'announcement.manage',
      order: 20,
    },
  ],
}
