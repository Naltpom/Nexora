import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import './_identity.scss'
import api from '../../api'
import PageSEO from './PageSEO'
import { validatePassword } from './passwordPolicy'

export default function Register() {
  const { t } = useTranslation('_identity')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError(t('register.error_invalid_email'))
      return
    }

    const pwdErrors = validatePassword(password)
    if (pwdErrors.length > 0) {
      setError(pwdErrors.map(k => t(k)).join(', '))
      return
    }

    if (password !== confirmPassword) {
      setError(t('register.error_password_mismatch'))
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/auth/register', {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
      })
      if (response.data.email_verification_required) {
        navigate('/verify-email', {
          state: { email: response.data.email, debugCode: response.data.debug_code || null },
        })
      } else {
        navigate('/login?registered=1')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || t('register.error_default'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <PageSEO page="register" />
      <div className="login-card" role="main" aria-busy={loading}>
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--primary)" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>{t('register.title')}</h1>
          <p>{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} aria-label={t('register.form_aria_label')} noValidate>
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite" id="register-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">{t('common.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('common.email_placeholder')}
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? 'register-error' : undefined}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label htmlFor="firstName">{t('common.first_name')}</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('register.first_name_placeholder')}
                required
                aria-required="true"
                autoComplete="given-name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">{t('common.last_name')}</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('register.last_name_placeholder')}
                required
                aria-required="true"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('common.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('common.password_policy_hint')}
              required
              aria-required="true"
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
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>

        <nav className="login-footer" aria-label={t('register.nav_aria_label')}>
          <Link to="/login" className="link-primary">
            {t('register.already_have_account')}
          </Link>
        </nav>
      </div>
    </div>
  )
}
