export default function BadgesSection() {
  return (
    <div className="storybook-section">
      <h2>Badges et Alertes</h2>

      <h3>Badges generiques</h3>
      <div className="storybook-row">
        <span className="badge badge-secondary">Secondaire</span>
        <span className="badge badge-success">Succes</span>
        <span className="badge badge-warning">Avertissement</span>
        <span className="badge badge-error">Erreur</span>
        <span className="badge badge-info">Information</span>
      </div>

      <h3>Badges actif / inactif</h3>
      <div className="storybook-row">
        <span className="badge-active badge-active-on">Actif</span>
        <span className="badge-active badge-active-off">Inactif</span>
      </div>

      <h3>Badge administrateur</h3>
      <div className="storybook-row">
        <span className="badge-admin badge-admin-on">Admin</span>
        <span className="badge-admin badge-admin-off">Non admin</span>
      </div>

      <h3>Badges de statut</h3>
      <div className="storybook-row">
        <span className="badge-status badge-status-online">En ligne</span>
        <span className="badge-status badge-status-away">Absent</span>
        <span className="badge-status badge-status-offline">Hors ligne</span>
      </div>

      <h3>Alertes</h3>
      <div className="storybook-preview">
        <div className="alert alert-error">
          Une erreur est survenue lors de la sauvegarde. Veuillez reessayer.
        </div>
        <div className="alert alert-success">
          Les modifications ont ete enregistrees avec succes.
        </div>
      </div>
    </div>
  )
}
