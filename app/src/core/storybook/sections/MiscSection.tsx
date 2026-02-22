export default function MiscSection() {
  return (
    <div className="storybook-section">
      <h2>Divers</h2>

      <h3>Spinner de chargement</h3>
      <div className="storybook-preview">
        <div className="loading-screen" aria-label="Chargement en cours">
          <div className="spinner" />
          Chargement...
        </div>
      </div>

      <h3>Squelettes de chargement (skeleton)</h3>
      <div className="storybook-preview">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-card" />
      </div>

      <h3>Barre de modifications (changes bar)</h3>
      <div className="storybook-preview">
        <div className="changes-bar">
          <span className="changes-bar-text">2 modifications non enregistrees</span>
          <div className="changes-bar-actions">
            <button className="btn btn-secondary" type="button">Annuler</button>
            <button className="btn btn-primary" type="button">Enregistrer</button>
          </div>
        </div>
      </div>

      <h3>Barre de modifications unifiee</h3>
      <div className="storybook-preview">
        <div className="unified-changes-bar">
          <span className="unified-changes-bar-text">
            <span className="unified-changes-bar-dot" />
            3 champs modifies
          </span>
          <div className="unified-changes-bar-actions">
            <button className="btn-unified-secondary" type="button">Annuler</button>
            <button className="btn-unified-primary" type="button">Sauvegarder</button>
          </div>
        </div>
      </div>

      <h3>Toggles (interrupteurs)</h3>
      <div className="storybook-preview">
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider" />
          </label>
          <span>Notifications activees</span>
        </div>
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" />
            <span className="toggle-slider" />
          </label>
          <span>Mode maintenance</span>
        </div>
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" defaultChecked disabled />
            <span className="toggle-slider" />
          </label>
          <span>Securite renforcee (verrouille)</span>
        </div>
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" disabled />
            <span className="toggle-slider" />
          </label>
          <span>Fonctionnalite desactivee (verrouille)</span>
        </div>
      </div>
    </div>
  )
}
