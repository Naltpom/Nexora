import { useTutorial } from './TutorialContext'
import '../../_identity/_identity.scss'
import './didacticiel.scss'

export default function TutorialSection() {
  const { tutorials, seenTutorials, startTutorial, resetAll } = useTutorial()

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">Didacticiels</h2>
      <p className="text-secondary">
        Revoyez les tutoriels in-app pour decouvrir les fonctionnalites.
      </p>

      {tutorials.length === 0 ? (
        <p className="tutorial-section__empty">
          Aucun didacticiel disponible.
        </p>
      ) : (
        <>
          <div className="flex-col-lg">
            {tutorials.map(tut => {
              const isSeen = !!seenTutorials[tut.id]
              return (
                <div
                  key={tut.id}
                  className="tutorial-section__item"
                >
                  <div>
                    <div className="tutorial-section__item-label">{tut.label}</div>
                    {tut.description && (
                      <div className="tutorial-section__item-desc">
                        {tut.description}
                      </div>
                    )}
                  </div>
                  <div className="tutorial-section__item-actions">
                    {isSeen && (
                      <span className="tutorial-section__seen-badge">Vu</span>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => startTutorial(tut.id)}
                      type="button"
                    >
                      {isSeen ? 'Revoir' : 'Commencer'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            className="btn btn-secondary mt-16"
            onClick={resetAll}
            type="button"
          >
            Reinitialiser tous les didacticiels
          </button>
        </>
      )}
    </div>
  )
}
