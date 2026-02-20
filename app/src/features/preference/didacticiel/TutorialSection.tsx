import { useTutorial } from './TutorialContext'

export default function TutorialSection() {
  const { tutorials, seenTutorials, startTutorial, resetAll } = useTutorial()

  return (
    <div className="unified-card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Didacticiels</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
        Revoyez les tutoriels in-app pour decouvrir les fonctionnalites.
      </p>

      {tutorials.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: 14, fontStyle: 'italic' }}>
          Aucun didacticiel disponible.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tutorials.map(tut => {
              const isSeen = !!seenTutorials[tut.id]
              return (
                <div
                  key={tut.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--gray-50)',
                    borderRadius: 8,
                    border: '1px solid var(--gray-200)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{tut.label}</div>
                    {tut.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {tut.description}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isSeen && (
                      <span style={{ fontSize: 12, color: 'var(--green-500, #22c55e)' }}>Vu</span>
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
            className="btn btn-secondary"
            onClick={resetAll}
            type="button"
            style={{ marginTop: 16 }}
          >
            Reinitialiser tous les didacticiels
          </button>
        </>
      )}
    </div>
  )
}
