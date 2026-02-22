import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import api from '../../api'
import MFABackupCodes from './MFABackupCodes'
import '../_identity/_identity.scss'
import './mfa.scss'

interface MFAMethodStatus {
  method: string
  is_enabled: boolean
  is_primary: boolean
}

interface MFAStatus {
  is_mfa_enabled: boolean
  methods: MFAMethodStatus[]
  backup_codes_remaining: number
  mfa_required_by_policy: boolean
  mfa_setup_required: boolean
}

interface AvailableMethod {
  name: string
  label: string
  enabled: boolean
}

export default function MFASetupPage() {
  const { t } = useTranslation('mfa')
  const { clearMfaSetupRequired } = useAuth()
  const [status, setStatus] = useState<MFAStatus | null>(null)
  const [availableMethods, setAvailableMethods] = useState<AvailableMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // TOTP setup
  const [totpSetupData, setTotpSetupData] = useState<{ qr_code_base64: string; secret: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpSaving, setTotpSaving] = useState(false)
  const [totpDisabling, setTotpDisabling] = useState(false)

  // Email
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailDisabling, setEmailDisabling] = useState(false)

  // Backup codes
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [backupGenerating, setBackupGenerating] = useState(false)

  // Success messages
  const [successMessage, setSuccessMessage] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/mfa/status')
      setStatus(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('setup_error_loading_status'))
    }
  }, [])

  const fetchMethods = useCallback(async () => {
    try {
      const res = await api.get('/mfa/methods')
      setAvailableMethods(res.data.methods || [])
    } catch {
      // Methods endpoint might not be available
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchStatus(), fetchMethods()]).finally(() => setLoading(false))
  }, [fetchStatus, fetchMethods])

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(''), 4000)
  }

  const isMethodAvailable = (method: string) => {
    if (availableMethods.length === 0) return true
    return availableMethods.some((m) => m.name === method && m.enabled)
  }

  const isMethodEnabled = (method: string): boolean => {
    if (!status) return false
    return status.methods.some((m) => m.method === method && m.is_enabled)
  }

  // ---- TOTP ----

  const handleTotpSetup = async () => {
    setTotpError('')
    setTotpSaving(true)
    try {
      const res = await api.post('/mfa/totp/setup')
      setTotpSetupData(res.data)
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || t('setup_totp_error_setup'))
    } finally {
      setTotpSaving(false)
    }
  }

  const handleTotpVerify = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setTotpError(t('setup_totp_error_6_digits'))
      return
    }
    setTotpError('')
    setTotpSaving(true)
    try {
      const res = await api.post('/mfa/totp/verify-setup', { code: totpCode })
      setTotpSetupData(null)
      setTotpCode('')
      // Show backup codes from response if provided
      if (res.data.codes && res.data.codes.length > 0) {
        setBackupCodes(res.data.codes)
      }
      await fetchStatus()
      clearMfaSetupRequired()
      showSuccess(t('setup_totp_success'))
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || t('setup_totp_error_invalid_code'))
    } finally {
      setTotpSaving(false)
    }
  }

  const handleTotpDisable = async () => {
    setTotpDisabling(true)
    try {
      await api.post('/mfa/totp/disable')
      await fetchStatus()
      showSuccess(t('setup_totp_disabled_success'))
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || t('setup_totp_error_disabling'))
    } finally {
      setTotpDisabling(false)
    }
  }

  // ---- Email ----

  const handleEmailEnable = async () => {
    setEmailSaving(true)
    try {
      await api.post('/mfa/email/enable')
      await fetchStatus()
      clearMfaSetupRequired()
      showSuccess(t('setup_email_success'))
    } catch (err: any) {
      setError(err.response?.data?.detail || t('setup_email_error_activation'))
    } finally {
      setEmailSaving(false)
    }
  }

  const handleEmailDisable = async () => {
    setEmailDisabling(true)
    try {
      await api.post('/mfa/email/disable')
      await fetchStatus()
      showSuccess(t('setup_email_disabled_success'))
    } catch (err: any) {
      setError(err.response?.data?.detail || t('setup_email_error_disabling'))
    } finally {
      setEmailDisabling(false)
    }
  }

  // ---- Backup Codes ----

  const handleGenerateBackupCodes = async () => {
    setBackupGenerating(true)
    try {
      const res = await api.post('/mfa/backup-codes/generate')
      setBackupCodes(res.data.codes || [])
      await fetchStatus()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('setup_backup_error_generating'))
    } finally {
      setBackupGenerating(false)
    }
  }

  if (loading) {
    return (
      <Layout breadcrumb={[{ label: t('setup_breadcrumb_home'), path: '/' }, { label: t('setup_breadcrumb_profile'), path: '/profile' }, { label: t('setup_breadcrumb_mfa') }]} title={t('setup_page_title_breadcrumb')}>
        <div className="loading-screen">
          <div className="spinner" />
          <p>{t('loading')}</p>
        </div>
      </Layout>
    )
  }

  const totpEnabled = isMethodEnabled('totp')
  const emailEnabled = isMethodEnabled('email')

  return (
    <Layout breadcrumb={[{ label: t('setup_breadcrumb_home'), path: '/' }, { label: t('setup_breadcrumb_profile'), path: '/profile' }, { label: t('setup_breadcrumb_mfa') }]} title={t('setup_page_title_breadcrumb')}>
      <div className="mfa-setup-page-layout">
        <div>
          <h1 className="mfa-setup-page-title">{t('setup_page_title')}</h1>
          <p className="mfa-setup-page-desc">
            {t('setup_page_description')}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        {/* Backup Codes Modal/Inline */}
        {backupCodes && (
          <MFABackupCodes codes={backupCodes} onClose={() => setBackupCodes(null)} />
        )}

        {/* TOTP Section */}
        {isMethodAvailable('totp') && (
          <div className="unified-card mfa-setup-section">
            <div className="mfa-setup-section-header">
              <div className="mfa-setup-section-info">
                <div className="mfa-setup-section-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <div>
                  <h3>{t('setup_totp_title')}</h3>
                  <p className="mfa-setup-section-desc">
                    {t('setup_totp_description')}
                  </p>
                </div>
              </div>
              {totpEnabled ? (
                <span className="mfa-badge mfa-badge-active">{t('badge_status_active')}</span>
              ) : (
                <span className="mfa-badge mfa-badge-inactive">{t('badge_status_inactive')}</span>
              )}
            </div>

            <div className="mfa-setup-section-body">
              {totpError && <div className="alert alert-error alert-spaced">{totpError}</div>}

              {totpEnabled && !totpSetupData && (
                <div className="mfa-setup-actions">
                  <p className="text-gray-500-sm">
                    {t('setup_totp_active_message')}
                  </p>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleTotpDisable}
                    disabled={totpDisabling}
                  >
                    {totpDisabling ? t('setup_totp_disabling') : t('setup_totp_disable')}
                  </button>
                </div>
              )}

              {!totpEnabled && !totpSetupData && (
                <button
                  className="btn btn-primary"
                  onClick={handleTotpSetup}
                  disabled={totpSaving}
                >
                  {totpSaving ? t('setup_totp_setup_loading') : t('setup_totp_setup')}
                </button>
              )}

              {totpSetupData && (
                <div className="mfa-totp-setup">
                  <p className="mfa-setup-totp-instructions">
                    {t('setup_totp_instructions')}
                  </p>

                  <div className="mfa-qr-container">
                    <img
                      src={`data:image/png;base64,${totpSetupData.qr_code_base64}`}
                      alt={t('setup_totp_qr_alt')}
                      className="mfa-qr-image"
                    />
                  </div>

                  <div className="mfa-secret-container">
                    <label className="mfa-secret-label">
                      {t('setup_totp_manual_key')}
                    </label>
                    <code className="mfa-secret-code">{totpSetupData.secret}</code>
                  </div>

                  <div className="form-group mt-16">
                    <label>{t('setup_totp_verification_label')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="mfa-code-input"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <div className="flex-row-sm">
                    <button
                      className="btn btn-primary"
                      onClick={handleTotpVerify}
                      disabled={totpSaving || totpCode.length !== 6}
                    >
                      {totpSaving ? t('setup_totp_verifying') : t('setup_totp_confirm')}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => { setTotpSetupData(null); setTotpCode(''); setTotpError('') }}
                      type="button"
                    >
                      {t('setup_totp_cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Section */}
        {isMethodAvailable('email') && (
          <div className="unified-card mfa-setup-section">
            <div className="mfa-setup-section-header">
              <div className="mfa-setup-section-info">
                <div className="mfa-setup-section-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <h3>{t('setup_email_title')}</h3>
                  <p className="mfa-setup-section-desc">
                    {t('setup_email_description')}
                  </p>
                </div>
              </div>
              {emailEnabled ? (
                <span className="mfa-badge mfa-badge-active">{t('badge_status_active')}</span>
              ) : (
                <span className="mfa-badge mfa-badge-inactive">{t('badge_status_inactive')}</span>
              )}
            </div>

            <div className="mfa-setup-section-body">
              {emailEnabled ? (
                <div className="mfa-setup-actions">
                  <p className="text-gray-500-sm">
                    {t('setup_email_active_message')}
                  </p>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleEmailDisable}
                    disabled={emailDisabling}
                  >
                    {emailDisabling ? t('setup_email_disabling') : t('setup_email_disable')}
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleEmailEnable}
                  disabled={emailSaving}
                >
                  {emailSaving ? t('setup_email_activating') : t('setup_email_activate')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Backup Codes Section */}
        <div className="unified-card mfa-setup-section">
          <div className="mfa-setup-section-header">
            <div className="mfa-setup-section-info">
              <div className="mfa-setup-section-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <h3>{t('setup_backup_title')}</h3>
                <p className="mfa-setup-section-desc">
                  {t('setup_backup_description')}
                </p>
              </div>
            </div>
            {status && status.backup_codes_remaining > 0 && (
              <span className="mfa-badge mfa-badge-active">
                {status.backup_codes_remaining} {status.backup_codes_remaining > 1 ? t('setup_backup_remaining_plural') : t('setup_backup_remaining')}
              </span>
            )}
          </div>

          <div className="mfa-setup-section-body">
            {status && status.backup_codes_remaining === 0 && (
              <p className="mfa-setup-no-backup-warning">
                {t('setup_backup_no_codes_warning')}
              </p>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleGenerateBackupCodes}
              disabled={backupGenerating}
            >
              {backupGenerating ? t('setup_backup_generating') : (status && status.backup_codes_remaining > 0 ? t('setup_backup_regenerate') : t('setup_backup_generate'))}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
