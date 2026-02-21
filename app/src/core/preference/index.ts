import { lazy } from 'react'
import type { FeatureTutorial } from '../../types'

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
  featureTutorial: {
    featureName: 'preference',
    label: 'Preferences',
    description: 'Personnalisez votre experience utilisateur.',
    permissionTutorials: [
      {
        permission: 'preference.read',
        label: 'Preferences utilisateur',
        description: 'Decouvrez la page de preferences.',
        steps: [
          {
            target: '.header-theme-toggle',
            title: 'Theme',
            description: 'Basculez entre le theme clair et sombre avec ce bouton.',
            position: 'bottom' as const,
          },
        ],
      },
      {
        permission: 'preference.theme.read',
        label: 'Personnaliser le theme',
        description: 'Choisissez votre theme et vos couleurs preferees.',
        steps: [
          {
            target: '.preference-theme-section',
            title: 'Section theme',
            description: 'Selectionnez un theme clair, sombre ou automatique selon vos preferences.',
            position: 'bottom' as const,
            navigateTo: '/profile/preferences?tab=theme',
          },
        ],
      },
      {
        permission: 'preference.couleur.read',
        label: 'Personnaliser les couleurs',
        description: 'Personnalisez les couleurs de l\'interface.',
        steps: [
          {
            target: '.preference-couleur-section',
            title: 'Couleurs',
            description: 'Choisissez la palette de couleurs qui vous convient.',
            position: 'bottom' as const,
            navigateTo: '/profile/preferences?tab=couleur',
          },
        ],
      },
      {
        permission: 'preference.font.read',
        label: 'Personnaliser la typographie',
        description: 'Ajustez la police et la taille du texte.',
        steps: [
          {
            target: '.preference-font-section',
            title: 'Typographie',
            description: 'Modifiez la police, la taille et le poids du texte pour une meilleure lisibilite.',
            position: 'bottom' as const,
            navigateTo: '/profile/preferences?tab=font',
          },
        ],
      },
      {
        permission: 'preference.layout.read',
        label: 'Personnaliser la mise en page',
        description: 'Configurez la densite et la disposition de l\'interface.',
        steps: [
          {
            target: '.preference-layout-section',
            title: 'Mise en page',
            description: 'Ajustez la densite (compact, normal, aere), les arrondis et la largeur du contenu.',
            position: 'bottom' as const,
            navigateTo: '/profile/preferences?tab=layout',
          },
        ],
      },
      {
        permission: 'preference.composants.read',
        label: 'Personnaliser les composants',
        description: 'Configurez l\'apparence des composants d\'interface.',
        steps: [
          {
            target: '.preference-composants-section',
            title: 'Composants',
            description: 'Personnalisez l\'apparence des boutons, tableaux et autres composants.',
            position: 'bottom' as const,
            navigateTo: '/profile/preferences?tab=composants',
          },
        ],
      },
      {
        permission: 'preference.accessibilite.read',
        label: 'Options d\'accessibilite',
        description: 'Activez les options d\'accessibilite pour une meilleure experience.',
        steps: [
          {
            target: '.preference-a11y-section',
            title: 'Accessibilite',
            description: 'Activez la reduction des animations, le mode contraste eleve ou d\'autres options d\'accessibilite.',
            position: 'bottom' as const,
            navigateTo: '/profile/preferences?tab=accessibilite',
          },
        ],
      },
      {
        permission: 'preference.didacticiel.read',
        label: 'Decouvrir la page Aide',
        description: 'Accedez aux tutoriels et a l\'aide en ligne.',
        steps: [
          {
            target: '.tutorial-section',
            title: 'Page Aide',
            description: 'Retrouvez ici tous les tutoriels disponibles, organises par fonctionnalite.',
            position: 'top' as const,
            navigateTo: '/aide',
          },
        ],
      },
      {
        permission: 'preference.didacticiel.manage',
        label: 'Reordonner les tutoriels',
        description: 'Personnalisez l\'ordre d\'affichage des tutoriels.',
        steps: [
          {
            target: '.tutorial-section',
            title: 'Gestion des tutoriels',
            description: 'Reordonnez les tutoriels par glisser-deposer pour les adapter a vos besoins.',
            position: 'top' as const,
            navigateTo: '/aide',
          },
        ],
      },
    ],
  } satisfies FeatureTutorial,
}
