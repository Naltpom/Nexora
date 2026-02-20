import { useState, useEffect, FormEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import axios from 'axios'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setVerifying(false)
    }
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await axios.post('/api/auth/verify-reset-token', { token })
      setTokenValid(true)
      setUserEmail(response.data.email)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Token invalide ou expire')
      setTokenValid(false)
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      await axios.post('/api/auth/reset-password', {
        token,
        new_password: newPassword,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la reinitialisation')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (verifying) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <div className="spinner" />
            <p>Verification du lien...</p>
          </div>
        </div>
      </div>
    )
  }

  // No token or invalid token
  if (!token || !tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#DC2626" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">!</text>
            </svg>
            <h1>Lien invalide</h1>
            <p>{error || 'Ce lien de reinitialisation est invalide, expire ou a deja ete utilise.'}</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">
            Retour a la connexion
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#059669" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">&#10003;</text>
            </svg>
            <h1>Mot de passe modifie</h1>
            <p>Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous connecter.</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#1E40AF" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>Nouveau mot de passe</h1>
          <p>Definissez un nouveau mot de passe pour <strong>{userEmail}</strong></p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="new-password">Nouveau mot de passe</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caracteres"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirmer le mot de passe</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre mot de passe"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
