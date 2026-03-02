import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../core/AuthContext'
import api from '../../api'
import PageSEO from './PageSEO'
import { validatePassword } from './passwordPolicy'

export default function ForceChangePassword() {
  const { t } = useTranslation('_identity')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refreshUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const pwdErrors = validatePassword(newPassword)
    if (pwdErrors.length > 0) {
      setError(pwdErrors.map(k => t(k)).join(', '))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('force_change_password.error_password_mismatch'))
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', { new_password: newPassword })
      await refreshUser()
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || t('force_change_password.error_default'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <PageSEO page="force_change_password" />
      <div className="login-card" role="main" aria-busy={loading}>
        <div className="login-header">
          <h1>{t('force_change_password.title')}</h1>
          <p>{t('force_change_password.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} aria-label={t('force_change_password.form_aria_label')} noValidate>
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite" id="force-change-password-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">{t('common.new_password')}</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('common.password_policy_hint')}
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'force-change-password-error' : undefined}
              autoFocus
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('common.confirm_password')}</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('common.confirm_password_placeholder_short')}
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
            {loading ? t('force_change_password.submitting') : t('force_change_password.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
