import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTutorial } from './TutorialContext'
import '../../_identity/_identity.scss'
import './didacticiel.scss'

export default function TutorialSection() {
  const { t } = useTranslation('preference.didacticiel')
  const {
    featureTutorials,
    permissionsSeen,
    startFeatureTutorial,
    startPermissionTutorial,
    startAllTutorials,
    resetAll,
  } = useTutorial()

  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(
    () => new Set(featureTutorials.map((ft) => ft.featureName))
  )

  const toggleFeature = (name: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="unified-card card-padded tutorial-section">
      <h2 className="title-sm">{t('tutorial_section_title')}</h2>
      <p className="text-secondary">
        {t('tutorial_section_description')}
      </p>

      {featureTutorials.length === 0 ? (
        <p className="tutorial-section__empty">{t('tutorial_section_empty')}</p>
      ) : (
        <>
          <div className="tutorial-section__features">
            {featureTutorials.map((ft) => {
              const isExpanded = expandedFeatures.has(ft.featureName)
              const allSeen = ft.permissionTutorials.every(
                (pt) => !!permissionsSeen[pt.permission]
              )

              return (
                <div key={ft.featureName} className="tutorial-feature">
                  <div className="tutorial-feature__header">
                    <button
                      className="tutorial-feature__toggle"
                      type="button"
                      onClick={() => toggleFeature(ft.featureName)}
                    >
                      <span
                        className={`tutorial-feature__chevron${isExpanded ? ' tutorial-feature__chevron--open' : ''}`}
                      >
                        &#9654;
                      </span>
                      <span className="tutorial-feature__name">{ft.label}</span>
                      {allSeen && (
                        <span className="tutorial-feature__seen-badge">{t('tutorial_section_seen_badge')}</span>
                      )}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => startFeatureTutorial(ft.featureName)}
                    >
                      {allSeen ? t('tutorial_section_review_all_feature') : t('tutorial_section_start_all_feature')}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="tutorial-feature__permissions">
                      {ft.permissionTutorials.map((pt) => {
                        const isSeen = !!permissionsSeen[pt.permission]
                        return (
                          <div key={pt.permission} className="tutorial-section__item">
                            <div>
                              <div className="tutorial-section__item-label">
                                {pt.label}
                                <span className="tutorial-section__step-count">
                                  {pt.steps.length} {pt.steps.length > 1 ? t('tutorial_section_step_count_plural') : t('tutorial_section_step_count_singular')}
                                </span>
                                <span className="tutorial-section__permission-code">
                                  {pt.permission}
                                </span>
                              </div>
                              {pt.description && (
                                <div className="tutorial-section__item-desc">
                                  {pt.description}
                                </div>
                              )}
                            </div>
                            <div className="tutorial-section__item-actions">
                              {isSeen && (
                                <span className="tutorial-section__seen-badge">
                                  {t('tutorial_section_seen_badge')}
                                </span>
                              )}
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                  startPermissionTutorial(ft.featureName, pt.permission)
                                }
                                type="button"
                              >
                                {isSeen ? t('tutorial_section_review_permission') : t('tutorial_section_start_permission')}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex-row mt-16">
            <button
              className="btn btn-primary"
              onClick={startAllTutorials}
              type="button"
            >
              {t('tutorial_section_review_all')}
            </button>
            <button
              className="btn btn-secondary"
              onClick={resetAll}
              type="button"
            >
              {t('tutorial_section_reset_all')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
