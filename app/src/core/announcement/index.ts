import { lazy } from 'react'

export const manifest = {
  name: 'announcement',
  routes: [
    {
      path: '/admin/announcements',
      component: lazy(() => import('./AnnouncementAdmin')),
      permission: 'announcement.create',
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
      path: '/announcements',
      icon: 'megaphone',
      section: 'user',
      permission: 'announcement.read',
      order: 37,
    },
    {
      label: 'Annonces',
      path: '/admin/announcements',
      icon: 'megaphone',
      section: 'admin',
      adminGroup: 'systeme',
      permission: 'announcement.create',
      order: 20,
    },
  ],
}
