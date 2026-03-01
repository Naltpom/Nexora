import { useState, useEffect, FormEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import PageSEO from './PageSEO'
import { validatePassword } from './passwordPolicy'

export default function ResetPassword() {
  const { t } = useTranslation('_identity')
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
      const response = await api.post('/auth/verify-reset-token', { token })
      setTokenValid(true)
      setUserEmail(response.data.email)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reset_password.error_token_invalid'))
      setTokenValid(false)
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const pwdErrors = validatePassword(newPassword)
    if (pwdErrors.length > 0) {
      setError(pwdErrors.map(k => t(k)).join(', '))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('reset_password.error_password_mismatch'))
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('reset_password.error_default'))
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (verifying) {
    return (
      <div className="reset-password-container">
        <PageSEO page="reset_password" />
        <div className="reset-password-card" role="main" aria-busy="true">
          <div className="reset-password-header">
            <div className="spinner" aria-hidden="true" />
            <p role="status">{t('reset_password.verifying')}</p>
          </div>
        </div>
      </div>
    )
  }

  // No token or invalid token
  if (!token || !tokenValid) {
    return (
      <div className="reset-password-container">
        <PageSEO page="reset_password" />
        <div className="reset-password-card" role="main">
          <div className="reset-password-header">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="var(--danger)" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">!</text>
            </svg>
            <h1>{t('reset_password.invalid_link_title')}</h1>
            <p role="alert">{error || t('reset_password.invalid_link_message')}</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">
            {t('common.back_to_login')}
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="reset-password-container">
        <PageSEO page="reset_password" />
        <div className="reset-password-card" role="main">
          <div className="reset-password-header">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="6" fill="var(--success)" />
              <text x="16" y="22" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">&#10003;</text>
            </svg>
            <h1>{t('reset_password.success_title')}</h1>
            <p role="status">{t('reset_password.success_message')}</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">
            {t('login.submit')}
          </Link>
        </div>
      </div>
    )
  }

  // Form state
  return (
    <div className="reset-password-container">
      <PageSEO page="reset_password" />
      <div className="reset-password-card" role="main" aria-busy={loading}>
        <div className="reset-password-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>{t('reset_password.form_title')}</h1>
          <p>{t('reset_password.form_subtitle_prefix')} <strong>{userEmail}</strong></p>
        </div>

        <form onSubmit={handleSubmit} aria-label={t('reset_password.form_aria_label')} noValidate>
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite" id="reset-password-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="new-password">{t('common.new_password')}</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('common.password_policy_hint')}
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'reset-password-error' : undefined}
              autoFocus
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">{t('common.confirm_password')}</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('common.confirm_password_placeholder')}
              required
              aria-required="true"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? t('reset_password.submitting') : t('reset_password.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
