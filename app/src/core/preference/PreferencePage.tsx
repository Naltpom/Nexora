import { Suspense, lazy } from 'react'
import Layout from '../../core/Layout'
import { useFeature } from '../../core/FeatureContext'

const ThemeSection = lazy(() => import('./theme/ThemeSection'))
const TutorialSection = lazy(() => import('./didacticiel/TutorialSection'))

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
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Preferences</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
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
      </div>
    </Layout>
  )
}
