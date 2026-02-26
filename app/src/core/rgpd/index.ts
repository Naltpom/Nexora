import { lazy } from 'react'

export const manifest = {
  name: 'rgpd',
  routes: [
    { path: '/rgpd/consent', component: lazy(() => import('./ConsentPage')), permission: 'rgpd.read' },
    { path: '/rgpd/my-data', component: lazy(() => import('./MyDataPage')), permission: 'rgpd.read' },
    { path: '/rgpd/rights', component: lazy(() => import('./RightsRequestPage')), permission: 'rgpd.read' },
    { path: '/rgpd/legal/:slug', component: lazy(() => import('./LegalPage')), public: true },
    { path: '/admin/rgpd', component: lazy(() => import('./AdminRGPDPage')), permission: 'rgpd.registre.read' },
  ],
  navItems: [
    { label: 'Mes donnees', path: '/rgpd/my-data', icon: 'shield-check', section: 'user', permission: 'rgpd.read', order: 50 },
    { label: 'RGPD', path: '/admin/rgpd', icon: 'shield-check', section: 'admin', adminGroup: 'securite', permission: 'rgpd.registre.read', order: 30 },
  ],
  headerComponents: [lazy(() => import('./CookieBanner'))],
}
