import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
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

// Module-level guard: track already-processed OAuth codes so the same
// code is never submitted twice (survives component unmount/remount).
// Values: 'pending' = request in flight, 'done' = navigated away successfully.
const processedCodes = new Map<string, 'pending' | 'done'>()

export default function SSOCallbackPage() {
  const { t } = useTranslation('sso')
  const { provider } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loginWithSSO, user, loading: authLoading } = useAuth()

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const linkTriggered = useRef(false)

  useEffect(() => {
    document.title = t('page_title')
  }, [t])

  // Determine action from state JWT
  const state = searchParams.get('state')
  const statePayload = state ? parseJwtPayload(state) : null
  const isLink = statePayload?.action === 'link'

  // Safety timeout: if still loading after 15s, show error
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) setError((e) => e ?? t('erreur_connexion_sso'))
        return false
      })
    }, 15000)
    return () => clearTimeout(timer)
  }, [t])

  // Login flow: runs immediately (no auth needed)
  useEffect(() => {
    if (isLink) return

    const code = searchParams.get('code')
    if (!code) {
      setError(t('parametres_callback_manquants'))
      setLoading(false)
      return
    }

    const status = processedCodes.get(code)
    if (status === 'done') {
      // Already successfully processed — navigation in progress
      return
    }
    if (status === 'pending') {
      // Request in flight from a previous mount — wait for timeout
      return
    }
    processedCodes.set(code, 'pending')

    if (!provider) {
      setError(t('parametres_callback_manquants'))
      setLoading(false)
      return
    }

    const exchangeCode = async () => {
      try {
        const response = await api.post(`/sso/${provider}/callback`, { code, state })
        const data = response.data
        processedCodes.set(code, 'done')

        if (data.mfa_required) {
          navigate('/mfa/verify', {
            state: { mfa_token: data.mfa_token, mfa_methods: data.mfa_methods },
          })
        } else {
          await loginWithSSO(data.access_token)

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
      } catch (err: any) {
        processedCodes.delete(code)
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : t('erreur_connexion_sso'))
        setLoading(false)
      }
    }

    exchangeCode()
  }, [provider, searchParams, navigate, loginWithSSO, isLink, state, t])

  // Link flow: wait for AuthContext to finish its refresh, then call /link
  // This avoids a double-refresh race condition that revokes all sessions.
  useEffect(() => {
    if (!isLink || authLoading || linkTriggered.current) return

    const code = searchParams.get('code')
    if (!code) {
      setError(t('parametres_callback_manquants'))
      setLoading(false)
      return
    }

    const status = processedCodes.get(code)
    if (status === 'done' || status === 'pending') return

    if (!user) {
      // AuthContext finished loading but no user → not authenticated
      setError(t('erreur_liaison_compte'))
      setLoading(false)
      return
    }

    processedCodes.set(code, 'pending')
    linkTriggered.current = true

    const doLink = async () => {
      try {
        await api.post(`/sso/${provider}/link`, { code, state })
        processedCodes.set(code, 'done')
        navigate('/profile', { replace: true })
      } catch (err: any) {
        processedCodes.delete(code)
        const detail = err.response?.data?.detail
        setError(typeof detail === 'string' ? detail : t('erreur_liaison_compte'))
        setLoading(false)
      }
    }

    doLink()
  }, [isLink, authLoading, user, provider, searchParams, navigate, state, t])

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="sr-only">{t('page_title')}</h1>

        {loading && !error && (
          <div className="sso-callback-loading" role="status" aria-busy="true" aria-live="polite">
            <div className="sso-spinner" aria-hidden="true" />
            <p className="sso-callback-loading-text">
              {t('connexion_en_cours')}
            </p>
          </div>
        )}

        {error && (
          <div className="sso-callback-error" role="alert">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h2 className="sso-callback-error-title">
              {t('echec_connexion')}
            </h2>
            <p className="sso-callback-error-message">
              {error}
            </p>
            <Link to="/login" className="btn btn-primary sso-callback-back-link">
              {t('retour_connexion')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
