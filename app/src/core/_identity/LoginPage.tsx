import { useState, FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './_identity.scss'
import { useAuth } from '../../core/AuthContext'
import SSOSection from '../sso/SSOSection'
import PageSEO from './PageSEO'

export default function Login() {
  const { t } = useTranslation('_identity')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
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
      setError(err.response?.data?.detail || t('login.error_default'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <PageSEO page="login" />
      <div className="login-card login-card-enter">
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>{t('login.welcome')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {searchParams.get('legal_refused') && (
            <div className="alert alert-warning mb-16">
              {t('login.legal_refused_warning')}
            </div>
          )}
          {searchParams.get('account_deleted') && (
            <div className="alert alert-info mb-16">
              {t('login.account_deleted_info')}
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">{t('login.email_label')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('common.email_placeholder')}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.password_label')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.password_placeholder')}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <SSOSection />

        <div className="login-footer-flex">
          <Link to="/forgot-password" className="link-primary">
            {t('login.forgot_password_link')}
          </Link>
          <Link to="/register" className="link-primary">
            {t('login.no_account_link')}
          </Link>
        </div>
      </div>
    </div>
  )
}
