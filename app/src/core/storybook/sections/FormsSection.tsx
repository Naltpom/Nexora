export default function FormsSection() {
  return (
    <div className="storybook-section">
      <h2>Formulaires</h2>

      <h3>Groupe de formulaire basique</h3>
      <div className="storybook-preview">
        <div className="form-group">
          <label>Nom complet</label>
          <input type="text" placeholder="Jean Dupont" />
        </div>
        <div className="form-group">
          <label>Adresse e-mail</label>
          <input type="email" placeholder="jean.dupont@exemple.fr" />
        </div>
      </div>

      <h3>Groupe avec select</h3>
      <div className="storybook-preview">
        <div className="form-group">
          <label>Role utilisateur</label>
          <select defaultValue="">
            <option value="" disabled>
              Choisir un role...
            </option>
            <option value="admin">Administrateur</option>
            <option value="editor">Editeur</option>
            <option value="viewer">Lecteur</option>
          </select>
        </div>
      </div>

      <h3>Groupe avec textarea</h3>
      <div className="storybook-preview">
        <div className="form-group">
          <label>Description</label>
          <textarea
            rows={4}
            placeholder="Decrivez brievement le projet ou la demande..."
          />
        </div>
      </div>

      <h3>Ligne de formulaire (.form-row)</h3>
      <div className="storybook-preview">
        <div className="form-row">
          <div className="form-group">
            <label>Prenom</label>
            <input type="text" placeholder="Jean" />
          </div>
          <div className="form-group">
            <label>Nom</label>
            <input type="text" placeholder="Dupont" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Ville</label>
            <input type="text" placeholder="Paris" />
          </div>
          <div className="form-group">
            <label>Code postal</label>
            <input type="text" placeholder="75001" />
          </div>
        </div>
      </div>

      <h3>Interrupteur (.toggle)</h3>
      <div className="storybook-preview">
        <div className="storybook-inline-demo">
          <label className="toggle">
            <input type="checkbox" defaultChecked={false} />
            <span className="toggle-slider" />
          </label>
          <span>Notifications par e-mail (desactive)</span>
        </div>
        <div className="storybook-inline-demo">
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider" />
          </label>
          <span>Mode sombre (active)</span>
        </div>
        <div className="storybook-inline-demo">
          <label className="toggle">
            <input type="checkbox" disabled />
            <span className="toggle-slider" />
          </label>
          <span>Option verrouillée (desactive, non modifiable)</span>
        </div>
      </div>

      <h3>Champ de recherche (.search-box)</h3>
      <div className="storybook-preview">
        <div className="search-box">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder="Rechercher un utilisateur..." />
        </div>
      </div>
    </div>
  )
}
