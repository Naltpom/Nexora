export default function CardsModalsSection() {
  return (
    <div className="storybook-section">
      <h2>Cartes et Modals</h2>

      <h3>Carte basique (.card)</h3>
      <div className="storybook-preview">
        <div className="card">
          <div className="card-header">
            <strong>Statistiques du mois</strong>
          </div>
          <div className="card-body">
            <p>
              Ce mois-ci, 142 nouveaux utilisateurs se sont inscrits sur la
              plateforme. Le taux de retention est de 87%, en hausse de 3 points
              par rapport au mois precedent.
            </p>
          </div>
        </div>
      </div>

      <h3>Carte unifiee (.unified-card)</h3>
      <div className="storybook-preview">
        <div className="unified-card">
          <div className="unified-card-header">
            <h2>Gestion des equipes</h2>
          </div>
          <div className="card-body">
            <p>
              Organisez vos collaborateurs en equipes pour faciliter la gestion
              des permissions et le suivi des projets. Chaque equipe peut avoir
              ses propres parametres et responsables.
            </p>
          </div>
        </div>
      </div>

      <h3>Modals de confirmation (apercu)</h3>

      <div className="storybook-label">Information</div>
      <div className="storybook-preview">
        <div className="confirm-modal">
          <div className="confirm-modal-header confirm-modal-info">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <h3>Information</h3>
          </div>
          <div className="confirm-modal-body">
            <p>
              Votre session expirera dans 5 minutes. Enregistrez vos
              modifications pour ne pas perdre votre travail.
            </p>
          </div>
          <div className="confirm-modal-footer">
            <button className="btn btn-secondary" type="button">
              Ignorer
            </button>
            <button className="btn btn-primary" type="button">
              Compris
            </button>
          </div>
        </div>
      </div>

      <div className="storybook-label">Avertissement</div>
      <div className="storybook-preview">
        <div className="confirm-modal">
          <div className="confirm-modal-header confirm-modal-warning">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3>Attention</h3>
          </div>
          <div className="confirm-modal-body">
            <p>
              Cette action modifiera les permissions de 12 utilisateurs. Les
              changements prendront effet immediatement apres confirmation.
            </p>
          </div>
          <div className="confirm-modal-footer">
            <button className="btn btn-secondary" type="button">
              Annuler
            </button>
            <button className="btn btn-warning" type="button">
              Confirmer
            </button>
          </div>
        </div>
      </div>

      <div className="storybook-label">Danger</div>
      <div className="storybook-preview">
        <div className="confirm-modal">
          <div className="confirm-modal-header confirm-modal-danger">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h3>Suppression definitive</h3>
          </div>
          <div className="confirm-modal-body">
            <p>
              Etes-vous sur de vouloir supprimer cet utilisateur ? Cette action
              est irreversible et toutes les donnees associees seront
              definitivement effacees.
            </p>
          </div>
          <div className="confirm-modal-footer">
            <button className="btn btn-secondary" type="button">
              Annuler
            </button>
            <button className="btn btn-danger" type="button">
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
