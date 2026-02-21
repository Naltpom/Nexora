import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import './_identity.scss'
import axios from 'axios'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    setLoading(true)
    try {
      await axios.post('/api/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="var(--success)" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">&#10003;</text>
            </svg>
            <h1>Demande envoyee</h1>
            <p>Si cette adresse existe dans notre systeme, un email sera envoye sous peu avec un lien valable 30 minutes.</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">
            Retour a la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>Mot de passe oublie</h1>
          <p>Entrez votre adresse email pour recevoir un lien de reinitialisation</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Adresse email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/login" className="link-primary">
            Retour a la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
