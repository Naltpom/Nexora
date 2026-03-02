import { useState, useEffect, FormEvent, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import api, { setAccessToken } from '../../api'
import { useAuth } from '../../core/AuthContext'
import './_identity.scss'
import PageSEO from './PageSEO'

export default function VerifyEmail() {
  const { t } = useTranslation('_identity')
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshUser } = useAuth()

  const email = (location.state as any)?.email || ''
  const initialDebugCode = (location.state as any)?.debugCode || null

  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [success, setSuccess] = useState(false)
  const [debugCode, setDebugCode] = useState<string | null>(initialDebugCode)

  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!email) {
      navigate('/register')
      return
    }
    startCooldown()
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    }
  }, [])

  const startCooldown = () => {
    setResendCooldown(60)
    if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    cooldownInterval.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    try {
      const response = await api.post('/auth/resend-verification', { email })
      if (response.data.debug_code) {
        setDebugCode(response.data.debug_code)
      }
      startCooldown()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('verify_email.error_resend'))
    }
  }

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await api.post('/auth/verify-email', { email, code: verificationCode })
      const { access_token } = response.data
      setAccessToken(access_token)
      await refreshUser()
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('verify_email.error_code_incorrect'))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="login-container">
        <PageSEO page="verify_email" />
        <div className="login-card" role="main">
          <div className="login-header">
            <div className="avatar-circle-lg" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1>{t('verify_email.success_title')}</h1>
          </div>
          <p className="text-center text-gray-500 mb-16" role="status">
            {t('verify_email.success_message')}
          </p>
          <p className="text-center text-gray-500" aria-live="polite">
            {t('common.redirecting')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <PageSEO page="verify_email" />
      <div className="login-card" role="main" aria-busy={submitting}>
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>{t('verify_email.title')}</h1>
          <p className="text-gray-500">
            {t('verify_email.code_sent_to')} <strong>{email}</strong>
          </p>
        </div>

        {debugCode && (
          <div className="verify-debug-box" role="note" aria-label={t('verify_email.debug_aria_label')}>
            <span className="verify-debug-label">{t('verify_email.debug_label')}</span>
            <span className="verify-debug-code">{debugCode}</span>
          </div>
        )}

        <form onSubmit={handleVerifyCode} aria-label={t('verify_email.form_aria_label')}>
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite" id="verify-email-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="verification-code">{t('verify_email.code_label')}</label>
            <input
              id="verification-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="verify-code-input"
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'verify-email-error' : 'verify-email-hint'}
              autoFocus
              disabled={submitting}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <p className="text-muted" id="verify-email-hint">
              {t('verify_email.code_validity')}
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting || verificationCode.length !== 6}
            aria-disabled={submitting || verificationCode.length !== 6}
          >
            {submitting ? t('verify_email.submitting') : t('verify_email.submit')}
          </button>

          <div className="text-center mt-16">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0}
              aria-disabled={resendCooldown > 0}
              className={resendCooldown > 0 ? 'verify-resend-btn verify-resend-btn--disabled' : 'verify-resend-btn verify-resend-btn--active'}
            >
              {resendCooldown > 0
                ? t('verify_email.resend_code_cooldown', { seconds: resendCooldown })
                : t('verify_email.resend_code')}
            </button>
          </div>
        </form>

        <nav className="login-footer" aria-label={t('verify_email.nav_aria_label')}>
          <Link to="/login" className="link-primary text-gray-500">
            {t('verify_email.back_to_login')}
          </Link>
        </nav>
      </div>
    </div>
  )
}
