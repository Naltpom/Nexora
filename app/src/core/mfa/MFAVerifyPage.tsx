import { useState, useEffect, useRef, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'
import api from '../../api'
import './mfa.scss'

type MFAMethod = 'totp' | 'email' | 'backup'

export default function MFAVerifyPage() {
  const { t } = useTranslation('mfa')

  const METHOD_LABELS: Record<MFAMethod, string> = {
    totp: t('method_label_application'),
    email: t('method_email'),
    backup: t('method_backup'),
  }
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyMFA } = useAuth()

  const state = location.state as { mfa_token?: string; mfa_methods?: string[] } | null
  const mfaToken = state?.mfa_token
  const mfaMethods = (state?.mfa_methods || []) as MFAMethod[]

  const [activeMethod, setActiveMethod] = useState<MFAMethod>(mfaMethods[0] || 'totp')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSending, setEmailSending] = useState(false)
  const [attemptsHint, setAttemptsHint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!mfaToken || mfaMethods.length === 0) {
      navigate('/login', { replace: true })
    }
  }, [mfaToken, mfaMethods, navigate])

  useEffect(() => {
    setCode('')
    setError('')
    setAttemptsHint('')
    setEmailSent(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [activeMethod])

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!code.trim() || !mfaToken) return

    setError('')
    setAttemptsHint('')
    setLoading(true)

    try {
      const result = await verifyMFA(mfaToken, code.trim(), activeMethod)
      if (result.must_change_password) {
        navigate('/change-password', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || t('verify_error_invalid_code')
      setError(detail)
      const remaining = err.response?.data?.remaining_attempts
      if (remaining !== undefined && remaining !== null) {
        setAttemptsHint(`${remaining} ${remaining > 1 ? t('verify_attempts_remaining_plural') : t('verify_attempts_remaining')} ${remaining > 1 ? t('verify_attempts_remaining_suffix_plural') : t('verify_attempts_remaining_suffix')}`)
      }
      setCode('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (value: string) => {
    if (activeMethod === 'backup') {
      // Allow alphanumeric and dash for backup codes
      const cleaned = value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
      setCode(cleaned)
      return
    }

    // TOTP and email: digits only, max 6
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)

    // Auto-submit when 6 digits entered
    if (digits.length === 6) {
      setTimeout(() => {
        handleSubmitWithCode(digits)
      }, 100)
    }
  }

  const handleSubmitWithCode = async (submitCode: string) => {
    if (!submitCode.trim() || !mfaToken) return

    setError('')
    setAttemptsHint('')
    setLoading(true)

    try {
      const result = await verifyMFA(mfaToken, submitCode.trim(), activeMethod)
      if (result.must_change_password) {
        navigate('/change-password', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || t('verify_error_invalid_code')
      setError(detail)
      const remaining = err.response?.data?.remaining_attempts
      if (remaining !== undefined && remaining !== null) {
        setAttemptsHint(`${remaining} ${remaining > 1 ? t('verify_attempts_remaining_plural') : t('verify_attempts_remaining')} ${remaining > 1 ? t('verify_attempts_remaining_suffix_plural') : t('verify_attempts_remaining_suffix')}`)
      }
      setCode('')
      setTimeout(() => inputRef.current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmailCode = async () => {
    if (!mfaToken) return
    setEmailSending(true)
    setError('')

    try {
      await api.post('/mfa/email/send-code', { mfa_token: mfaToken })
      setEmailSent(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('verify_email_error_sending'))
    } finally {
      setEmailSending(false)
    }
  }

  if (!mfaToken) return null

  return (
    <div className="mfa-verify-container">
      <div className="mfa-verify-card">
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="var(--primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>{t('verify_title')}</h1>
          <p>{t('verify_subtitle')}</p>
        </div>

        {mfaMethods.length > 1 && (
          <div className="mfa-methods-tabs">
            {mfaMethods.map((method) => (
              <button
                key={method}
                className={`mfa-method-tab${activeMethod === method ? ' active' : ''}`}
                onClick={() => setActiveMethod(method)}
                type="button"
              >
                {METHOD_LABELS[method] || method}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}
          {attemptsHint && (
            <div className="mfa-attempts-hint">{attemptsHint}</div>
          )}

          {activeMethod === 'email' && !emailSent && (
            <div className="mfa-email-prompt">
              <p>{t('verify_email_prompt')}</p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleSendEmailCode}
                disabled={emailSending}
              >
                {emailSending ? t('verify_email_sending') : t('verify_email_send')}
              </button>
            </div>
          )}

          {(activeMethod !== 'email' || emailSent) && (
            <>
              <div className="form-group">
                <label>
                  {activeMethod === 'totp' && t('verify_label_totp')}
                  {activeMethod === 'email' && t('verify_label_email')}
                  {activeMethod === 'backup' && t('verify_label_backup')}
                </label>
                {activeMethod === 'backup' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="mfa-backup-input"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="xxxxxx-xxxxxx"
                    autoFocus
                    autoComplete="one-time-code"
                  />
                ) : (
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    className="mfa-code-input"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || !code.trim()}
              >
                {loading ? t('verify_verifying') : t('verify_submit')}
              </button>

              {activeMethod === 'email' && emailSent && (
                <button
                  type="button"
                  className="mfa-resend-btn"
                  onClick={handleSendEmailCode}
                  disabled={emailSending}
                >
                  {emailSending ? t('verify_email_resending') : t('verify_email_resend')}
                </button>
              )}
            </>
          )}
        </form>

        <div className="mfa-back-link">
          <button
            type="button"
            className="mfa-link-btn"
            onClick={() => navigate('/login', { replace: true })}
          >
            {t('verify_back_to_login')}
          </button>
        </div>
      </div>
    </div>
  )
}
