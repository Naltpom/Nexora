import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

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
  featureTutorial: {
    featureName: 'rgpd',
    label: 'RGPD & Confidentialite',
    description: 'Gerez vos preferences de consentement et vos donnees personnelles.',
    permissionTutorials: [
      {
        permission: 'rgpd.read',
        label: 'Vos donnees personnelles',
        description: 'Decouvrez comment consulter, exporter et supprimer vos donnees.',
        steps: [
          {
            target: '.rgpd-data-sections',
            title: 'Apercu de vos donnees',
            description: 'Visualisez toutes les donnees personnelles collectees, organisees par categorie.',
            position: 'top' as const,
            navigateTo: '/rgpd/my-data',
          },
          {
            target: '.rgpd-consent-list',
            title: 'Preferences de consentement',
            description: 'Activez ou desactivez chaque type de cookies et traceurs. Les cookies necessaires ne peuvent pas etre desactives.',
            position: 'top' as const,
            navigateTo: '/rgpd/consent',
          },
          {
            target: '.rgpd-rights-cta',
            title: 'Exercer vos droits',
            description: 'Soumettez une demande d\'acces, de rectification, de suppression ou de portabilite de vos donnees.',
            position: 'top' as const,
            navigateTo: '/rgpd/my-data',
          },
        ],
      },
      {
        permission: 'rgpd.registre.read',
        label: 'Administration RGPD',
        description: 'Gerez le registre des traitements, les demandes de droits et les pages legales.',
        steps: [
          {
            target: '.rgpd-tabs',
            title: 'Onglets d\'administration',
            description: 'Naviguez entre le registre des traitements, les demandes de droits, l\'audit et les pages legales.',
            position: 'bottom' as const,
            navigateTo: '/admin/rgpd',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
