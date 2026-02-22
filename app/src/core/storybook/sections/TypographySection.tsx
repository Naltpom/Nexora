export default function TypographySection() {
  return (
    <div className="storybook-section">
      <h2>Typographie</h2>

      <h3>Titres</h3>
      <div className="storybook-preview">
        <h1>Titre H1 — Tableau de bord</h1>
        <h2>Titre H2 — Gestion des utilisateurs</h2>
        <h3>Titre H3 — Parametres du compte</h3>
        <h4>Titre H4 — Notifications recentes</h4>
        <h5>Titre H5 — Details de la session</h5>
        <h6>Titre H6 — Informations complementaires</h6>
      </div>

      <h3>Texte courant</h3>
      <div className="storybook-preview">
        <p>
          Bienvenue sur la plateforme de gestion. Cette application vous permet
          de gerer vos utilisateurs, configurer les permissions et suivre
          l'activite en temps reel. Chaque module est concu pour offrir une
          experience fluide et intuitive.
        </p>
      </div>

      <h3>Graisses typographiques</h3>
      <div className="storybook-preview">
        <p className="storybook-font-weight-400">
          Regular (400) — Texte standard pour le contenu principal
        </p>
        <p className="storybook-font-weight-500">
          Medium (500) — Labels et sous-titres
        </p>
        <p className="storybook-font-weight-600">
          Semibold (600) — Titres de sections
        </p>
        <p className="storybook-font-weight-700">
          Bold (700) — Mise en evidence importante
        </p>
      </div>

      <h3>Palette de couleurs (variables CSS)</h3>
      <table className="storybook-color-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Valeur</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>--primary</code></td>
            <td><code>#1E40AF</code></td>
            <td>Couleur principale, boutons primaires, liens</td>
          </tr>
          <tr>
            <td><code>--primary-light</code></td>
            <td><code>#3B82F6</code></td>
            <td>Variante claire, icones, accents</td>
          </tr>
          <tr>
            <td><code>--primary-dark</code></td>
            <td><code>#1E3A8A</code></td>
            <td>Variante sombre, hover des boutons primaires</td>
          </tr>
          <tr>
            <td><code>--success</code></td>
            <td><code>#059669</code></td>
            <td>Confirmations, alertes de succes</td>
          </tr>
          <tr>
            <td><code>--warning</code></td>
            <td><code>#D97706</code></td>
            <td>Avertissements, etats en attente</td>
          </tr>
          <tr>
            <td><code>--danger</code></td>
            <td><code>#DC2626</code></td>
            <td>Erreurs, suppressions, alertes critiques</td>
          </tr>
          <tr>
            <td><code>--gray-50</code></td>
            <td><code>#F9FAFB</code></td>
            <td>Arriere-plan tres clair</td>
          </tr>
          <tr>
            <td><code>--gray-100</code></td>
            <td><code>#F3F4F6</code></td>
            <td>Arriere-plan des champs, hover subtil</td>
          </tr>
          <tr>
            <td><code>--gray-200</code></td>
            <td><code>#E5E7EB</code></td>
            <td>Bordures, separateurs</td>
          </tr>
          <tr>
            <td><code>--gray-300</code></td>
            <td><code>#D1D5DB</code></td>
            <td>Bordures de formulaires</td>
          </tr>
          <tr>
            <td><code>--gray-400</code></td>
            <td><code>#9CA3AF</code></td>
            <td>Placeholders, texte tertiaire</td>
          </tr>
          <tr>
            <td><code>--gray-500</code></td>
            <td><code>#6B7280</code></td>
            <td>Texte secondaire, icones inactives</td>
          </tr>
          <tr>
            <td><code>--gray-600</code></td>
            <td><code>#4B5563</code></td>
            <td>Sous-titres, texte moyen</td>
          </tr>
          <tr>
            <td><code>--gray-700</code></td>
            <td><code>#374151</code></td>
            <td>Labels de formulaires, texte fort</td>
          </tr>
          <tr>
            <td><code>--gray-800</code></td>
            <td><code>#1F2937</code></td>
            <td>Titres principaux</td>
          </tr>
          <tr>
            <td><code>--gray-900</code></td>
            <td><code>#111827</code></td>
            <td>Texte le plus sombre, corps principal</td>
          </tr>
        </tbody>
      </table>

      <h3>Demonstration des couleurs en contexte</h3>
      <div className="storybook-row">
        <button className="btn btn-primary" type="button">
          --primary
        </button>
        <button className="btn btn-success" type="button">
          --success
        </button>
        <button className="btn btn-warning" type="button">
          --warning
        </button>
        <button className="btn btn-danger" type="button">
          --danger
        </button>
      </div>
      <div className="storybook-row">
        <div className="alert alert-success">
          Alerte succes — utilise <code>--success</code>
        </div>
      </div>
      <div className="storybook-row">
        <div className="alert alert-error">
          Alerte erreur — utilise <code>--danger</code>
        </div>
      </div>
    </div>
  )
}
