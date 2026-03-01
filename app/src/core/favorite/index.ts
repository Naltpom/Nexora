import { lazy } from 'react'

export const manifest = {
  name: 'favorite',
  routes: [
    {
      path: '/favorites',
      component: lazy(() => import('./FavoritesPage')),
      permission: 'favorite.read',
    },
  ],
  navItems: [
    {
      label: 'Favoris',
      path: '/favorites',
      icon: 'star',
      section: 'user',
      permission: 'favorite.read',
      order: 35,
    },
  ],
  headerComponents: [lazy(() => import('./FavoriteButton'))],
}
