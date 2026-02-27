import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'
import api from '../../api'
import '../_identity/_identity.scss'
import './mfa.scss'

export default function MFAForceSetupPage() {
  const { t } = useTranslation('mfa')
  const navigate = useNavigate()
  const { clearMfaSetupRequired, logout } = useAuth()

  const [loading, setLoading] = useState(true)
  const [availableMethods, setAvailableMethods] = useState<string[]>([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // TOTP
  const [totpSetupData, setTotpSetupData] = useState<{ qr_code_base64: string; secret: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpSaving, setTotpSaving] = useState(false)

  // Email
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSetupPending, setEmailSetupPending] = useState(false)
  const [emailVerifyCode, setEmailVerifyCode] = useState('')
  const [emailVerifyError, setEmailVerifyError] = useState('')
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [emailResendCooldown, setEmailResendCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // SEO: set document.title for public page
  useEffect(() => {
    document.title = t('force_document_title')
  }, [t])

  const fetchMethods = useCallback(async () => {
    try {
      const res = await api.get('/mfa/methods')
      const methods = (res.data.methods || [])
        .filter((m: any) => m.enabled)
        .map((m: any) => m.name)
      setAvailableMethods(methods)
    } catch {
      setAvailableMethods(['totp', 'email'])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const onSetupComplete = () => {
    clearMfaSetupRequired()
    setSuccessMessage(t('force_success'))
    setTimeout(() => navigate('/'), 1500)
  }

  const formatCooldown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const startCooldown = (seconds: number) => {
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    setEmailResendCooldown(seconds)
    cooldownRef.current = setInterval(() => {
      setEmailResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const parseCooldownFromError = (err: any): number | null => {
    if (err.response?.status === 429) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'object' && detail?.retry_after_seconds) {
        return detail.retry_after_seconds
      }
    }
    return null
  }

  // TOTP
  const handleTotpSetup = async () => {
    setTotpError('')
    setTotpSaving(true)
    try {
      const res = await api.post('/mfa/totp/setup')
      setTotpSetupData(res.data)
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || t('force_totp_error_generic'))
    } finally {
      setTotpSaving(false)
    }
  }

  const handleTotpVerify = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setTotpError(t('force_totp_error_6_digits'))
      return
    }
    setTotpError('')
    setTotpSaving(true)
    try {
      await api.post('/mfa/totp/verify-setup', { code: totpCode })
      onSetupComplete()
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || t('force_totp_error_invalid_code'))
    } finally {
      setTotpSaving(false)
    }
  }

  // Email
  const handleEmailEnable = async () => {
    setEmailSaving(true)
    setEmailVerifyError('')
    try {
      const res = await api.post('/mfa/email/enable')
      setEmailSetupPending(true)
      startCooldown(res.data.resend_cooldown_seconds || 120)
    } catch (err: any) {
      const cd = parseCooldownFromError(err)
      if (cd) {
        setEmailSetupPending(true)
        startCooldown(cd)
      } else {
        setError(err.response?.data?.detail || t('force_email_error_activation'))
      }
    } finally {
      setEmailSaving(false)
    }
  }

  const handleEmailVerifySetup = async () => {
    if (!emailVerifyCode || emailVerifyCode.length !== 6) {
      setEmailVerifyError(t('force_totp_error_6_digits'))
      return
    }
    setEmailVerifyError('')
    setEmailVerifying(true)
    try {
      await api.post('/mfa/email/verify-setup', { code: emailVerifyCode })
      onSetupComplete()
    } catch (err: any) {
      setEmailVerifyError(err.response?.data?.detail || t('force_email_error_invalid_code'))
    } finally {
      setEmailVerifying(false)
    }
  }

  const handleEmailResendCode = async () => {
    setEmailSaving(true)
    try {
      const res = await api.post('/mfa/email/enable')
      startCooldown(res.data.resend_cooldown_seconds || 120)
    } catch (err: any) {
      const cd = parseCooldownFromError(err)
      if (cd) {
        startCooldown(cd)
      } else {
        setEmailVerifyError(err.response?.data?.detail || t('force_email_error_activation'))
      }
    } finally {
      setEmailSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="login-container" aria-busy="true">
        <div className="login-card" role="status">
          <div className="spinner" aria-hidden="true" />
          <span className="sr-only">{t('force_loading_alt')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <main className="login-card mfa-force-card" aria-busy={totpSaving || emailSaving || emailVerifying}>
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning, #D97706)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={t('force_logo_alt')}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h1 className="mfa-force-title">{t('force_title')}</h1>
          <p className="mfa-force-subtitle">
            {t('force_subtitle')}
          </p>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {successMessage && <div className="alert alert-success" role="status" aria-live="polite">{successMessage}</div>}

        {!successMessage && (
          <div className="mfa-force-methods-col">
            {/* TOTP */}
            {availableMethods.includes('totp') && (
              <section className="mfa-force-method-card" aria-labelledby="force-totp-title">
                <h2 className="mfa-force-method-title" id="force-totp-title">{t('force_totp_title')}</h2>
                <p className="mfa-force-method-desc">
                  {t('force_totp_description')}
                </p>

                {totpError && <div className="alert alert-error alert-spaced" role="alert">{totpError}</div>}

                {!totpSetupData ? (
                  <button className="btn btn-primary" onClick={handleTotpSetup} disabled={totpSaving} aria-busy={totpSaving}>
                    {totpSaving ? t('force_totp_loading') : t('force_totp_setup')}
                  </button>
                ) : (
                  <div>
                    <div className="mfa-force-qr-center">
                      <img
                        src={`data:image/png;base64,${totpSetupData.qr_code_base64}`}
                        alt={t('force_totp_qr_alt')}
                        className="mfa-force-qr-img"
                      />
                    </div>
                    <div className="mfa-force-secret-hint">
                      {t('force_totp_secret_label')} <code>{totpSetupData.secret}</code>
                    </div>
                    <div className="form-group">
                      <label htmlFor="force-totp-code">{t('force_totp_verification_label')}</label>
                      <input
                        id="force-totp-code"
                        type="text"
                        inputMode="numeric"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                        aria-required="true"
                        aria-invalid={!!totpError}
                        aria-describedby={totpError ? 'force-totp-error' : undefined}
                      />
                      {totpError && <span id="force-totp-error" className="sr-only">{totpError}</span>}
                    </div>
                    <div className="flex-row-sm">
                      <button className="btn btn-primary" onClick={handleTotpVerify} disabled={totpSaving || totpCode.length !== 6} aria-busy={totpSaving}>
                        {totpSaving ? t('force_totp_verifying') : t('force_totp_confirm')}
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setTotpSetupData(null); setTotpCode(''); setTotpError('') }}>
                        {t('force_totp_cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Email */}
            {availableMethods.includes('email') && (
              <section className="mfa-force-method-card" aria-labelledby="force-email-title">
                <h2 className="mfa-force-method-title" id="force-email-title">{t('force_email_title')}</h2>
                <p className="mfa-force-method-desc">
                  {t('force_email_description')}
                </p>

                {emailVerifyError && <div className="alert alert-error alert-spaced" role="alert">{emailVerifyError}</div>}

                {!emailSetupPending ? (
                  <button className="btn btn-primary" onClick={handleEmailEnable} disabled={emailSaving} aria-busy={emailSaving}>
                    {emailSaving ? t('force_email_activating') : t('force_email_activate')}
                  </button>
                ) : (
                  <div>
                    <p className="mfa-force-method-desc">{t('setup_email_verify_instructions')}</p>
                    <div className="form-group">
                      <label htmlFor="force-email-code">{t('verify_label_email')}</label>
                      <input
                        id="force-email-code"
                        type="text"
                        inputMode="numeric"
                        value={emailVerifyCode}
                        onChange={(e) => setEmailVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                        aria-required="true"
                        aria-invalid={!!emailVerifyError}
                        aria-describedby={emailVerifyError ? 'force-email-error' : undefined}
                      />
                      {emailVerifyError && <span id="force-email-error" className="sr-only">{emailVerifyError}</span>}
                    </div>
                    <div className="flex-row-sm">
                      <button className="btn btn-primary" onClick={handleEmailVerifySetup} disabled={emailVerifying || emailVerifyCode.length !== 6} aria-busy={emailVerifying}>
                        {emailVerifying ? t('force_totp_verifying') : t('force_totp_confirm')}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleEmailResendCode}
                        disabled={emailSaving || emailResendCooldown > 0}
                        aria-busy={emailSaving}
                      >
                        {emailSaving ? t('verify_email_resending') : emailResendCooldown > 0 ? t('verify_email_resend_cooldown', { time: formatCooldown(emailResendCooldown) }) : t('verify_email_resend')}
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setEmailSetupPending(false); setEmailVerifyCode(''); setEmailVerifyError(''); setEmailResendCooldown(0) }}>
                        {t('force_totp_cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {availableMethods.length === 0 && (
              <p className="mfa-force-no-methods" role="status">
                {t('force_no_methods')}
              </p>
            )}
          </div>
        )}

        <button
          className="btn btn-secondary mfa-force-logout-btn"
          onClick={() => { logout(); navigate('/login') }}
        >
          {t('force_logout')}
        </button>
      </main>
    </div>
  )
}
