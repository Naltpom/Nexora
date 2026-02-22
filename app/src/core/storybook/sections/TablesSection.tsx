export default function TablesSection() {
  return (
    <div className="storybook-section">
      <h2>Tableaux</h2>

      <h3>Tableau basique</h3>
      <div className="storybook-preview">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="th-sortable">
                  Nom <span className="sort-indicator">&#9650;</span>
                </th>
                <th className="th-sortable">
                  Email <span className="sort-indicator">&#9660;</span>
                </th>
                <th>Role</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="user-me">Marie Dupont (vous)</span></td>
                <td>marie.dupont@exemple.fr</td>
                <td>Administrateur</td>
                <td><span className="badge badge-success">Actif</span></td>
              </tr>
              <tr>
                <td>Jean Martin</td>
                <td>jean.martin@exemple.fr</td>
                <td>Editeur</td>
                <td><span className="badge badge-success">Actif</span></td>
              </tr>
              <tr>
                <td>Sophie Bernard</td>
                <td>sophie.bernard@exemple.fr</td>
                <td>Lecteur</td>
                <td><span className="badge badge-warning">En attente</span></td>
              </tr>
              <tr>
                <td>Pierre Leroy</td>
                <td>pierre.leroy@exemple.fr</td>
                <td>Editeur</td>
                <td><span className="badge badge-error">Inactif</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3>Tableau unifie (unified table)</h3>
      <div className="storybook-preview">
        <div className="unified-card">
          <div className="unified-page-header">
            <div className="unified-page-header-info">
              <h1>Utilisateurs</h1>
              <p>Liste des comptes enregistres sur la plateforme.</p>
            </div>
            <div className="unified-page-header-actions">
              <button className="btn-unified-primary" type="button">
                Ajouter
              </button>
            </div>
          </div>

          <div className="unified-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Rechercher un utilisateur..." readOnly />
          </div>

          <div className="card-table">
            <table className="unified-table">
              <thead>
                <tr>
                  <th className="th-sortable">Nom</th>
                  <th className="th-sortable">Email</th>
                  <th>Role</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="user-me">Marie Dupont (vous)</span></td>
                  <td>marie.dupont@exemple.fr</td>
                  <td>Administrateur</td>
                  <td><span className="badge badge-success">Actif</span></td>
                </tr>
                <tr>
                  <td>Jean Martin</td>
                  <td>jean.martin@exemple.fr</td>
                  <td>Editeur</td>
                  <td><span className="badge badge-success">Actif</span></td>
                </tr>
                <tr>
                  <td>Sophie Bernard</td>
                  <td>sophie.bernard@exemple.fr</td>
                  <td>Lecteur</td>
                  <td><span className="badge badge-warning">En attente</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="unified-pagination">
            <span className="unified-pagination-info">
              Affichage 1-3 sur 12 resultats
            </span>
            <div className="unified-pagination-controls">
              <button className="unified-pagination-btn" type="button" disabled>
                &laquo;
              </button>
              <button className="unified-pagination-btn active" type="button">
                1
              </button>
              <button className="unified-pagination-btn" type="button">
                2
              </button>
              <button className="unified-pagination-btn" type="button">
                3
              </button>
              <span className="unified-pagination-dots">...</span>
              <button className="unified-pagination-btn" type="button">
                4
              </button>
              <button className="unified-pagination-btn" type="button">
                &raquo;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
