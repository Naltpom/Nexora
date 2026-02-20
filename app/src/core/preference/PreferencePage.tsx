import { Suspense, lazy } from 'react'
import Layout from '../../core/Layout'
import { useFeature } from '../../core/FeatureContext'
import '../_identity/_identity.scss'
import './preference.scss'

const ThemeSection = lazy(() => import('./theme/ThemeSection'))
const TutorialSection = lazy(() => import('./didacticiel/TutorialSection'))
const TutorialAdminSection = lazy(() => import('./didacticiel/TutorialAdminSection'))

export default function PreferencePage() {
  const { isActive } = useFeature()

  return (
    <Layout
      breadcrumb={[
        { label: 'Accueil', path: '/' },
        { label: 'Mon profil', path: '/profile' },
        { label: 'Preferences' },
      ]}
      title="Preferences"
    >
      <div className="page-narrow">
        <div>
          <h1 className="title-md">Preferences</h1>
          <p className="text-gray-500">
            Personnalisez votre experience utilisateur.
          </p>
        </div>

        {isActive('preference.theme') && (
          <Suspense fallback={null}>
            <ThemeSection />
          </Suspense>
        )}

        {isActive('preference.didacticiel') && (
          <Suspense fallback={null}>
            <TutorialSection />
          </Suspense>
        )}

        {isActive('preference.didacticiel') && (
          <Suspense fallback={null}>
            <TutorialAdminSection />
          </Suspense>
        )}
      </div>
    </Layout>
  )
}
