export default function ButtonsSection() {
  return (
    <div className="storybook-section">
      <h2>Boutons</h2>

      <h3>Boutons standard</h3>
      <div className="storybook-row">
        <button className="btn btn-primary" type="button">
          Primaire
        </button>
        <button className="btn btn-secondary" type="button">
          Secondaire
        </button>
        <button className="btn btn-danger" type="button">
          Danger
        </button>
        <button className="btn btn-success" type="button">
          Succes
        </button>
        <button className="btn btn-warning" type="button">
          Avertissement
        </button>
      </div>

      <h3>Boutons petits (.btn-sm)</h3>
      <div className="storybook-row">
        <button className="btn btn-sm btn-primary" type="button">
          Primaire SM
        </button>
        <button className="btn btn-sm btn-secondary" type="button">
          Secondaire SM
        </button>
        <button className="btn btn-sm btn-danger" type="button">
          Danger SM
        </button>
        <button className="btn btn-sm btn-success" type="button">
          Succes SM
        </button>
        <button className="btn btn-sm btn-warning" type="button">
          Avertissement SM
        </button>
      </div>

      <h3>Bouton pleine largeur (.btn-block)</h3>
      <div className="storybook-preview">
        <button className="btn btn-block btn-primary" type="button">
          Enregistrer les modifications
        </button>
      </div>

      <h3>Etats desactives</h3>
      <div className="storybook-row">
        <button className="btn btn-primary" type="button" disabled>
          Primaire desactive
        </button>
        <button className="btn btn-secondary" type="button" disabled>
          Secondaire desactive
        </button>
        <button className="btn btn-danger" type="button" disabled>
          Danger desactive
        </button>
        <button className="btn btn-success" type="button" disabled>
          Succes desactive
        </button>
      </div>

      <h3>Boutons icones (.btn-icon)</h3>
      <div className="storybook-row">
        <button className="btn-icon btn-icon-secondary" type="button" title="Modifier">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-primary" type="button" title="Ajouter">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-danger" type="button" title="Supprimer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-active" type="button" title="Actif">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
      <div className="storybook-label">
        Secondaire / Primaire / Danger / Actif
      </div>

      <h3>Boutons unifies (.btn-unified)</h3>
      <div className="storybook-row">
        <button className="btn-unified-primary" type="button">
          Creer un utilisateur
        </button>
        <button className="btn-unified-secondary" type="button">
          Annuler
        </button>
      </div>
      <div className="storybook-row">
        <button className="btn-unified-primary" type="button" disabled>
          Unifie primaire desactive
        </button>
        <button className="btn-unified-secondary" type="button" disabled>
          Unifie secondaire desactive
        </button>
      </div>
    </div>
  )
}
