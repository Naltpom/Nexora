import { useState, FormEvent, Suspense, lazy } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'
import { useFeature } from '../../core/FeatureContext'

const SSOButtons = lazy(() => import('../sso/SSOButtons'))

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { isActive } = useFeature()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.email_verification_required) {
        navigate('/verify-email', {
          state: { email: result.email_verification_email || email, debugCode: result.debug_code || null },
        })
      } else if (result.mfa_required) {
        navigate('/mfa/verify', {
          state: { mfa_token: result.mfa_token, mfa_methods: result.mfa_methods },
        })
      } else if (result.must_change_password) {
        navigate('/change-password')
      } else if (result.mfa_setup_required) {
        const expires = result.mfa_grace_period_expires ? new Date(result.mfa_grace_period_expires) : null
        if (expires && new Date() >= expires) {
          navigate('/mfa/force-setup')
        } else {
          const returnTo = searchParams.get('returnTo')
          navigate(returnTo || '/')
        }
      } else {
        const returnTo = searchParams.get('returnTo')
        navigate(returnTo || '/')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#1E40AF" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>Bienvenue</h1>
          <p>Connectez-vous pour acceder a la plateforme</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
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

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {isActive('sso') && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
            </div>
            <Suspense fallback={null}>
              <SSOButtons />
            </Suspense>
          </>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: 14 }}>
            Mot de passe oublie ?
          </Link>
          <Link to="/register" style={{ color: 'var(--primary)', fontSize: 14 }}>
            Pas encore de compte ? Creez-en un
          </Link>
        </div>
      </div>
    </div>
  )
}
