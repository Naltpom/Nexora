export default function NavigationSection() {
  return (
    <div className="storybook-section">
      <h2>Navigation</h2>

      <h3>Fil d'Ariane (breadcrumb)</h3>
      <div className="storybook-preview">
        <nav className="breadcrumb">
          <a className="breadcrumb-link" href="#storybook">Accueil</a>
          <span className="breadcrumb-separator">/</span>
          <a className="breadcrumb-link" href="#storybook">Administration</a>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Gestion des utilisateurs</span>
        </nav>
      </div>

      <h3>Multi-select (etat ferme)</h3>
      <div className="storybook-preview">
        <div className="multi-select-container">
          <div className="multi-select-trigger">
            <span className="badge badge-info">Editeur</span>
            <span className="badge badge-info">Lecteur</span>
          </div>
        </div>
      </div>

      <h3>Search select (etat ferme)</h3>
      <div className="storybook-preview">
        <div className="search-select">
          <div className="search-select-trigger">
            <span>Administrateur</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      <h3>Search select avec placeholder</h3>
      <div className="storybook-preview">
        <div className="search-select">
          <div className="search-select-trigger">
            <span className="search-select-placeholder">Selectionner un role...</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
