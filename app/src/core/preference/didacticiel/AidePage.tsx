import { Suspense, lazy, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../Layout'
import { usePermission } from '../../PermissionContext'
import { useTutorial } from './TutorialContext'
import './didacticiel.scss'

const TutorialSection = lazy(() => import('./TutorialSection'))
const TutorialAdminSection = lazy(() => import('./TutorialAdminSection'))

export default function AidePage() {
  const { t } = useTranslation('preference.didacticiel')
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
        { label: t('aide_breadcrumb_home'), path: '/' },
        { label: t('aide_breadcrumb_aide') },
      ]}
      title={t('aide_title')}
    >
      <div className="page-narrow">
        <div>
          <h1 className="title-md">{t('aide_title')}</h1>
          <p className="text-gray-500">
            {t('aide_description')}
          </p>
        </div>

        <div className="aide-stats">
          <div className="aide-stats__card">
            <span className="aide-stats__value">{stats.totalSteps}</span>
            <span className="aide-stats__label">{t('aide_stats_tutorial_steps')}</span>
          </div>
          <div className="aide-stats__card">
            <span className="aide-stats__value">{stats.withTuto}</span>
            <span className="aide-stats__label">{t('aide_stats_permissions_with_tutorial')}</span>
          </div>
          <div className="aide-stats__card">
            <span className="aide-stats__value">{stats.withoutTuto}</span>
            <span className="aide-stats__label">{t('aide_stats_permissions_without_tutorial')}</span>
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
