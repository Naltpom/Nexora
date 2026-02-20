import { lazy } from 'react'

export const manifest = {
  name: 'sso',
  routes: [
    {
      path: '/sso/callback/:provider',
      component: lazy(() => import('./SSOCallbackPage')),
      public: true,
    },
  ],
}
