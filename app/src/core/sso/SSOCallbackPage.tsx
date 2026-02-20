import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'
import api from '../../api'
import './sso.scss'

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export default function SSOCallbackPage() {
  const { provider } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithSSO } = useAuth()

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const called = useRef(false)

  useEffect(() => {
    // Guard against StrictMode double-call
    if (called.current) return
    called.current = true

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !provider) {
      setError('Parametres de callback manquants.')
      setLoading(false)
      return
    }

    // Determine action from JWT state payload
    const statePayload = state ? parseJwtPayload(state) : null
    const isLink = statePayload?.action === 'link'

    const exchangeCode = async () => {
      try {
        if (isLink) {
          // Link flow: call /link endpoint (requires auth token)
          await api.post(`/sso/${provider}/link`, { code, state })
          navigate('/profile', { replace: true })
        } else {
          // Login flow: call /callback endpoint
          const response = await api.post(`/sso/${provider}/callback`, { code, state })
          const data = response.data

          if (data.mfa_required) {
            navigate('/mfa/verify', {
              state: { mfa_token: data.mfa_token, mfa_methods: data.mfa_methods },
            })
          } else {
            // Store MFA setup flags before loginWithSSO
            if (data.mfa_setup_required) {
              localStorage.setItem('mfa_setup_required', 'true')
              if (data.mfa_grace_period_expires) {
                localStorage.setItem('mfa_grace_period_expires', data.mfa_grace_period_expires)
              }
            }

            await loginWithSSO(data.access_token, data.refresh_token)

            // Handle MFA setup enforcement
            if (data.mfa_setup_required) {
              const expires = data.mfa_grace_period_expires ? new Date(data.mfa_grace_period_expires) : null
              if (expires && new Date() >= expires) {
                navigate('/mfa/force-setup', { replace: true })
              } else {
                navigate('/', { replace: true })
              }
            } else {
              navigate('/', { replace: true })
            }
          }
        }
      } catch (err: any) {
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : isLink ? 'Erreur lors de la liaison du compte.' : 'Erreur lors de la connexion SSO.')
        setLoading(false)
      }
    }

    exchangeCode()
  }, [provider, searchParams, navigate, loginWithSSO])

  return (
    <div className="login-container">
      <div className="login-card">
        {loading && !error && (
          <div className="sso-callback-loading">
            <div className="sso-spinner" />
            <p className="sso-callback-loading-text">
              Connexion en cours...
            </p>
          </div>
        )}

        {error && (
          <div className="sso-callback-error">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h2 className="sso-callback-error-title">
              Echec de la connexion
            </h2>
            <p className="sso-callback-error-message">
              {error}
            </p>
            <Link to="/login" className="btn btn-primary sso-callback-back-link">
              Retour a la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
