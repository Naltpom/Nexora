import { Suspense, lazy, useMemo } from 'react'
import Layout from '../../Layout'
import { usePermission } from '../../PermissionContext'
import { useTutorial } from './TutorialContext'
import './didacticiel.scss'

const TutorialSection = lazy(() => import('./TutorialSection'))
const TutorialAdminSection = lazy(() => import('./TutorialAdminSection'))

export default function AidePage() {
  const { permissions } = usePermission()
  const { featureTutorials } = useTutorial()

  const stats = useMemo(() => {
    const tutorialPerms = new Set<string>()
    let totalSteps = 0
    for (const ft of featureTutorials) {
      for (const pt of ft.permissionTutorials) {
        tutorialPerms.add(pt.permission)
        totalSteps += pt.steps.length
      }
    }
    const withTuto = permissions.filter((p) => tutorialPerms.has(p)).length
    const withoutTuto = permissions.length - withTuto
    return { withTuto, withoutTuto, totalSteps, totalPerms: permissions.length }
  }, [permissions, featureTutorials])

  return (
    <Layout
      breadcrumb={[
        { label: 'Accueil', path: '/' },
        { label: 'Aide' },
      ]}
      title="Aide"
    >
      <div className="page-narrow">
        <div>
          <h1 className="title-md">Aide</h1>
          <p className="text-gray-500">
            Decouvrez les fonctionnalites de l'application grace aux tutoriels interactifs.
          </p>
        </div>

        <div className="aide-stats">
          <div className="aide-stats__card">
            <span className="aide-stats__value">{stats.totalSteps}</span>
            <span className="aide-stats__label">Etapes de tutoriel</span>
          </div>
          <div className="aide-stats__card">
            <span className="aide-stats__value">{stats.withTuto}</span>
            <span className="aide-stats__label">Permissions avec tuto</span>
          </div>
          <div className="aide-stats__card">
            <span className="aide-stats__value">{stats.withoutTuto}</span>
            <span className="aide-stats__label">Permissions sans tuto</span>
          </div>
        </div>

        <Suspense fallback={null}>
          <TutorialSection />
        </Suspense>

        <Suspense fallback={null}>
          <TutorialAdminSection />
        </Suspense>
      </div>
    </Layout>
  )
}
