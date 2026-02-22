import { useState, useEffect, FormEvent, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useAuth } from '../../core/AuthContext'
import './_identity.scss'

type Step = 'loading' | 'invalid' | 'form' | 'verify' | 'success'

interface InvitationInfo {
  inviter_name: string
  email: string
  user_exists: boolean
  expires_at: string
}

export default function AcceptInvitation() {
  const { t } = useTranslation('_identity')
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [step, setStep] = useState<Step>('loading')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [error, setError] = useState('')

  // Form fields for existing user
  const [password, setPassword] = useState('')

  // Form fields for new user
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Verification code
  const [verificationCode, setVerificationCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    validateToken()
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    }
  }, [token])

  const validateToken = async () => {
    try {
      const response = await api.get(`/invitations/${token}`)
      setInvitation(response.data)
      setStep('form')
    } catch (err: any) {
      setError(err.response?.data?.detail || t('accept_invitation.error_invalid_or_expired'))
      setStep('invalid')
    }
  }

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

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let payload: any
      if (invitation?.user_exists) {
        payload = { password }
      } else {
        if (newPassword !== confirmPassword) {
          setError(t('accept_invitation.error_password_mismatch'))
          setSubmitting(false)
          return
        }
        if (newPassword.length < 6) {
          setError(t('accept_invitation.error_password_min_6'))
          setSubmitting(false)
          return
        }
        payload = {
          first_name: firstName,
          last_name: lastName,
          password: newPassword,
        }
      }

      await api.post(`/invitations/${token}/accept`, payload)
      setStep('verify')
      startCooldown()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('accept_invitation.error_default'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    try {
      await api.post(`/invitations/${token}/send-code`)
      startCooldown()
    } catch (err: any) {
      setVerifyError(err.response?.data?.detail || t('accept_invitation.error_resend'))
    }
  }

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setVerifyError('')
    setSubmitting(true)

    try {
      const response = await api.post(`/invitations/${token}/verify`, { code: verificationCode })
      const { access_token, refresh_token } = response.data

      // Store tokens
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      // Refresh user context so ProtectedRoute knows we're authenticated
      await refreshUser()

      setStep('success')

      // Redirect after 2 seconds
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setVerifyError(err.response?.data?.detail || t('accept_invitation.error_code_incorrect'))
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (step === 'loading') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="text-center">
            <div className="spinner spinner-centered" />
            <p>{t('accept_invitation.loading_message')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid token
  if (step === 'invalid') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>{t('accept_invitation.invalid_title')}</h1>
          </div>
          <div className="alert alert-error mb-16">
            {error}
          </div>
          <p className="text-gray-500 mb-16">
            {t('accept_invitation.invalid_message')}
          </p>
          <Link to="/login" className="btn btn-primary btn-block">
            {t('common.back_to_login')}
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="avatar-circle-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1>{t('accept_invitation.success_title')}</h1>
          </div>
          <p className="text-center text-gray-500 mb-16">
            {t('accept_invitation.success_message')}
          </p>
          <p className="text-center text-gray-500">
            {t('common.redirecting')}
          </p>
        </div>
      </div>
    )
  }

  // Verification code step
  if (step === 'verify') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>{t('accept_invitation.verify_title')}</h1>
            <p className="text-gray-500">
              {t('accept_invitation.verify_code_sent_to')} <strong>{invitation?.email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyCode}>
            {verifyError && <div className="alert alert-error">{verifyError}</div>}

            <div className="form-group">
              <label>{t('accept_invitation.verify_code_label')}</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="verify-code-input"
                required
                autoFocus
                disabled={submitting}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting || verificationCode.length !== 6}>
              {submitting ? t('accept_invitation.verify_submitting') : t('accept_invitation.verify_submit')}
            </button>

            <div className="text-center mt-16">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className={resendCooldown > 0 ? 'verify-resend-btn verify-resend-btn--disabled' : 'verify-resend-btn verify-resend-btn--active'}
              >
                {resendCooldown > 0
                  ? t('accept_invitation.verify_resend_cooldown', { seconds: resendCooldown })
                  : t('accept_invitation.verify_resend')}
              </button>
            </div>

            <p className="text-muted text-center mt-16">
              {t('accept_invitation.verify_code_validity')}
            </p>
          </form>
        </div>
      </div>
    )
  }

  // Form step (existing user or new user)
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="avatar-square">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1>{t('accept_invitation.form_title_prefix')} {invitation?.inviter_name}</h1>
          <p className="text-gray-500">
            {invitation?.user_exists
              ? t('accept_invitation.existing_user_subtitle')
              : t('accept_invitation.new_user_subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmitForm}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>{t('common.email')}</label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              className="input-disabled-bg"
            />
          </div>

          {invitation?.user_exists ? (
            // Existing user - just needs password
            <div className="form-group">
              <label>{t('common.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('accept_invitation.password_placeholder')}
                required
                autoFocus
                disabled={submitting}
              />
            </div>
          ) : (
            // New user - needs full registration
            <>
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>{t('common.first_name')}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('accept_invitation.first_name_placeholder')}
                    required
                    autoFocus
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>{t('common.last_name')}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('accept_invitation.last_name_placeholder')}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t('common.password')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('common.password_min_6')}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>{t('common.confirm_password')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('common.confirm_password_placeholder_short')}
                  required
                  disabled={submitting}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? t('accept_invitation.submitting') : invitation?.user_exists ? t('accept_invitation.submit_existing_user') : t('accept_invitation.submit_new_user')}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/login" className="text-gray-500">
            {t('accept_invitation.cancel_link')}
          </Link>
        </div>
      </div>
    </div>
  )
}
