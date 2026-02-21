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
        permission: 'rgpd.consentement.read',
        label: 'Gerer le consentement cookies',
        description: 'Configurez vos preferences de cookies et traceurs.',
        steps: [
          {
            target: '.rgpd-consent-list',
            title: 'Consentement',
            description: 'Activez ou desactivez chaque categorie de cookies et traceurs selon vos preferences.',
            position: 'top' as const,
            navigateTo: '/rgpd/consent',
          },
        ],
      },
      {
        permission: 'rgpd.export.read',
        label: 'Exporter vos donnees',
        description: 'Telechargez une copie de vos donnees personnelles.',
        steps: [
          {
            target: '.rgpd-export-buttons',
            title: 'Export de donnees',
            description: 'Exportez vos donnees personnelles au format CSV ou JSON.',
            position: 'bottom' as const,
            navigateTo: '/rgpd/my-data',
          },
        ],
      },
      {
        permission: 'rgpd.droits.read',
        label: 'Exercer vos droits',
        description: 'Soumettez une demande d\'exercice de vos droits RGPD.',
        steps: [
          {
            target: '.rgpd-rights-cta',
            title: 'Demande de droits',
            description: 'Soumettez une demande d\'acces, de rectification, d\'effacement ou de portabilite de vos donnees.',
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
            navigateTo: '/admin/rgpd?tab=registre',
          },
        ],
      },
      {
        permission: 'rgpd.consentement.manage',
        label: 'Administrer les consentements',
        description: 'Gerez les configurations de consentement de la plateforme.',
        steps: [
          {
            target: '.rgpd-tabs',
            title: 'Administration des consentements',
            description: 'Configurez les categories de consentement et suivez les statistiques d\'acceptation.',
            position: 'bottom' as const,
            navigateTo: '/admin/rgpd?tab=registre',
          },
        ],
      },
      {
        permission: 'rgpd.droits.manage',
        label: 'Traiter les demandes de droits',
        description: 'Repondez aux demandes d\'exercice de droits des utilisateurs.',
        steps: [
          {
            target: '.rgpd-tabs',
            title: 'Demandes de droits',
            description: 'Consultez les demandes en attente et traitez-les : acceptation, refus ou mise en cours. Cliquez sur \"Traiter\" pour repondre.',
            position: 'bottom' as const,
            navigateTo: '/admin/rgpd?tab=droits',
          },
        ],
      },
      {
        permission: 'rgpd.politique.manage',
        label: 'Editer les pages legales',
        description: 'Modifiez le contenu des pages legales de la plateforme.',
        steps: [
          {
            target: '.rgpd-legal-list',
            title: 'Pages legales',
            description: 'Editez les pages legales : politique de confidentialite, CGU, mentions legales. Cliquez sur \"Editer\" pour modifier le contenu.',
            position: 'top' as const,
            navigateTo: '/admin/rgpd?tab=pages',
          },
        ],
      },
      {
        permission: 'rgpd.audit.read',
        label: 'Consulter l\'audit RGPD',
        description: 'Consultez le journal des acces aux donnees personnelles.',
        steps: [
          {
            target: '.rgpd-audit-table',
            title: 'Journal d\'audit',
            description: 'Suivez les acces aux donnees personnelles : qui, quand, quelle action et sur quelle ressource.',
            position: 'top' as const,
            navigateTo: '/admin/rgpd?tab=audit',
          },
        ],
      },
      {
        permission: 'rgpd.registre.manage',
        label: 'Gerer le registre',
        description: 'Ajoutez, modifiez et supprimez les traitements du registre RGPD.',
        steps: [
          {
            target: '.rgpd-section-header',
            title: 'Gestion du registre',
            description: 'Cliquez sur \"Ajouter un traitement\" pour creer une nouvelle entree au registre Article 30.',
            position: 'bottom' as const,
            navigateTo: '/admin/rgpd?tab=registre',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
