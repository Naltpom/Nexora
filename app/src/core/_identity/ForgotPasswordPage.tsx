import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './_identity.scss'
import api from '../../api'
import PageSEO from './PageSEO'

export default function ForgotPassword() {
  const { t } = useTranslation('_identity')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('forgot_password.error_default'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="reset-password-container">
        <PageSEO page="forgot_password" />
        <div className="reset-password-card" role="main">
          <div className="reset-password-header">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="var(--success)" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">&#10003;</text>
            </svg>
            <h1>{t('forgot_password.success_title')}</h1>
            <p role="status">{t('forgot_password.success_message')}</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">
            {t('common.back_to_login')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-container">
      <PageSEO page="forgot_password" />
      <div className="reset-password-card" role="main" aria-busy={loading}>
        <div className="reset-password-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>{t('forgot_password.title')}</h1>
          <p>{t('forgot_password.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} aria-label={t('forgot_password.form_aria_label')} noValidate>
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite" id="forgot-password-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('forgot_password.email_label')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('common.email_placeholder')}
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'forgot-password-error' : undefined}
              autoFocus
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? t('forgot_password.submitting') : t('forgot_password.submit')}
          </button>
        </form>

        <nav className="login-footer" aria-label={t('forgot_password.nav_aria_label')}>
          <Link to="/login" className="link-primary">
            {t('common.back_to_login')}
          </Link>
        </nav>
      </div>
    </div>
  )
}
