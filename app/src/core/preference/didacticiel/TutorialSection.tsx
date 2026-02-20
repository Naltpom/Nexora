import { useState } from 'react'
import { useTutorial } from './TutorialContext'
import '../../_identity/_identity.scss'
import './didacticiel.scss'

export default function TutorialSection() {
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
    <div className="unified-card card-padded">
      <h2 className="title-sm">Didacticiels</h2>
      <p className="text-secondary">
        Revoyez les tutoriels in-app pour decouvrir les fonctionnalites.
      </p>

      {featureTutorials.length === 0 ? (
        <p className="tutorial-section__empty">Aucun didacticiel disponible.</p>
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
                        <span className="tutorial-feature__seen-badge">Vu</span>
                      )}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => startFeatureTutorial(ft.featureName)}
                    >
                      {allSeen ? 'Revoir tout' : 'Tout lancer'}
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
                                  Vu
                                </span>
                              )}
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                  startPermissionTutorial(ft.featureName, pt.permission)
                                }
                                type="button"
                              >
                                {isSeen ? 'Revoir' : 'Commencer'}
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
              Tout revoir
            </button>
            <button
              className="btn btn-secondary"
              onClick={resetAll}
              type="button"
            >
              Reinitialiser
            </button>
          </div>
        </>
      )}
    </div>
  )
}
