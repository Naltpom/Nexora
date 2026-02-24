import { useState, useEffect, useCallback } from 'react'
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

  const onSetupComplete = () => {
    clearMfaSetupRequired()
    setSuccessMessage(t('force_success'))
    setTimeout(() => navigate('/'), 1500)
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
    try {
      await api.post('/mfa/email/enable')
      onSetupComplete()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('force_email_error_activation'))
    } finally {
      setEmailSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card mfa-force-card">
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning, #D97706)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h1 className="mfa-force-title">{t('force_title')}</h1>
          <p className="mfa-force-subtitle">
            {t('force_subtitle')}
          </p>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        {successMessage && <div className="alert alert-success" aria-live="polite">{successMessage}</div>}

        {!successMessage && (
          <div className="mfa-force-methods-col">
            {/* TOTP */}
            {availableMethods.includes('totp') && (
              <div className="mfa-force-method-card">
                <h3 className="mfa-force-method-title">{t('force_totp_title')}</h3>
                <p className="mfa-force-method-desc">
                  {t('force_totp_description')}
                </p>

                {totpError && <div className="alert alert-error alert-spaced" role="alert">{totpError}</div>}

                {!totpSetupData ? (
                  <button className="btn btn-primary" onClick={handleTotpSetup} disabled={totpSaving}>
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
                      <label>{t('force_totp_verification_label')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    <div className="flex-row-sm">
                      <button className="btn btn-primary" onClick={handleTotpVerify} disabled={totpSaving || totpCode.length !== 6}>
                        {totpSaving ? t('force_totp_verifying') : t('force_totp_confirm')}
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setTotpSetupData(null); setTotpCode(''); setTotpError('') }}>
                        {t('force_totp_cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email */}
            {availableMethods.includes('email') && (
              <div className="mfa-force-method-card">
                <h3 className="mfa-force-method-title">{t('force_email_title')}</h3>
                <p className="mfa-force-method-desc">
                  {t('force_email_description')}
                </p>
                <button className="btn btn-primary" onClick={handleEmailEnable} disabled={emailSaving}>
                  {emailSaving ? t('force_email_activating') : t('force_email_activate')}
                </button>
              </div>
            )}

            {availableMethods.length === 0 && (
              <p className="mfa-force-no-methods">
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
      </div>
    </div>
  )
}
