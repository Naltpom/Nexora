import { useState, FormEvent, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import './_identity.scss'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import { useFeature } from '../../core/FeatureContext'
import { useScrollReveal } from '../../core/hooks'
import { applyCustomColors } from '../preference/couleur/applyCustomColors'
import api from '../../api'
import { validatePassword } from './passwordPolicy'

const SSOAccountLinks = lazy(() => import('../sso/SSOAccountLinks'))
const MFAStatusBadge = lazy(() => import('../mfa/MFAStatusBadge'))

export default function Profile() {
  const { t } = useTranslation('_identity')
  const { user, refreshUser, getPreference, updatePreference } = useAuth()
  const { isActive } = useFeature()

  const infoRef = useScrollReveal<HTMLDivElement>()
  const passwordRef = useScrollReveal<HTMLDivElement>()
  const mfaRef = useScrollReveal<HTMLDivElement>()
  const ssoRef = useScrollReveal<HTMLDivElement>()
  const prefsRef = useScrollReveal<HTMLDivElement>()

  // User info
  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [infoMessage, setInfoMessage] = useState('')
  const [infoError, setInfoError] = useState('')
  const [infoSaving, setInfoSaving] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdMessage, setPwdMessage] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  // Theme
  const currentTheme = getPreference('theme', 'light') as string

  const handleSaveInfo = async (e: FormEvent) => {
    e.preventDefault()
    setInfoError('')
    setInfoMessage('')
    setInfoSaving(true)
    try {
      await api.put('/auth/me', {
        first_name: firstName,
        last_name: lastName,
        email,
      })
      await refreshUser()
      setInfoMessage(t('profile.info_success'))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setInfoError(detail.map((e: any) => e.msg).join(', '))
      } else {
        setInfoError(detail || t('profile.info_error'))
      }
    } finally {
      setInfoSaving(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdMessage('')

    const pwdErrors = validatePassword(newPassword)
    if (pwdErrors.length > 0) {
      setPwdError(pwdErrors.map(k => t(k)).join(', '))
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError(t('profile.password_mismatch_error'))
      return
    }

    setPwdSaving(true)
    try {
      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPwdMessage(t('profile.password_success'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setPwdError(detail.map((e: any) => e.msg).join(', '))
      } else {
        setPwdError(detail || t('profile.password_error'))
      }
    } finally {
      setPwdSaving(false)
    }
  }

  const handleThemeChange = (theme: string) => {
    updatePreference('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
    const customColors = getPreference('customColors', null)
    applyCustomColors(customColors, theme)
  }

  return (
    <Layout breadcrumb={[{ label: t('profile.breadcrumb_home'), path: '/' }, { label: t('profile.breadcrumb_profile') }]} title={t('profile.page_title')}>
      <div className="page-narrow">
        <h1 className="sr-only">{t('profile.page_title')}</h1>

        {/* User Info Section */}
        <section className="unified-card card-padded reveal-up" ref={infoRef} aria-labelledby="profile-info-title">
          <h2 className="title-sm" id="profile-info-title">{t('profile.section_personal_info')}</h2>
          <form onSubmit={handleSaveInfo} aria-labelledby="profile-info-title">
            {infoError && <div className="alert alert-error alert-spaced" role="alert">{infoError}</div>}
            {infoMessage && <div className="alert alert-success alert-spaced" role="status">{infoMessage}</div>}

            <div className="form-group">
              <label htmlFor="profile-email">{t('common.email')}</label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-required="true"
              />
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label htmlFor="profile-firstname">{t('common.first_name')}</label>
                <input
                  id="profile-firstname"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="profile-lastname">{t('common.last_name')}</label>
                <input
                  id="profile-lastname"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={infoSaving}>
              {infoSaving ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </section>

        {/* Password Section */}
        <section className="unified-card card-padded reveal-up" ref={passwordRef} aria-labelledby="profile-password-title">
          <h2 className="title-sm" id="profile-password-title">{t('profile.section_change_password')}</h2>
          <form onSubmit={handleChangePassword} aria-labelledby="profile-password-title">
            {pwdError && <div className="alert alert-error alert-spaced" role="alert">{pwdError}</div>}
            {pwdMessage && <div className="alert alert-success alert-spaced" role="status">{pwdMessage}</div>}

            <div className="form-group">
              <label htmlFor="profile-current-password">{t('common.current_password')}</label>
              <input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                aria-required="true"
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-new-password">{t('common.new_password')}</label>
              <input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('common.password_policy_hint')}
                required
                aria-required="true"
                aria-describedby="profile-new-password-hint"
                autoComplete="new-password"
              />
              <span id="profile-new-password-hint" className="sr-only">{t('common.password_policy_hint')}</span>
            </div>

            <div className="form-group">
              <label htmlFor="profile-confirm-password">{t('common.confirm_new_password')}</label>
              <input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-required="true"
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
              {pwdSaving ? t('profile.password_submitting') : t('profile.password_submit')}
            </button>
          </form>
        </section>

        {/* MFA Section */}
        {isActive('mfa') && (
          <section className="unified-card card-padded reveal-up" ref={mfaRef} aria-labelledby="profile-mfa-title">
            <div className="flex-between mb-16">
              <h2 className="title-sm mb-0" id="profile-mfa-title">{t('profile.section_mfa')}</h2>
              <Suspense fallback={null}>
                <MFAStatusBadge />
              </Suspense>
            </div>
            <p className="text-secondary">
              {t('profile.mfa_description')}
            </p>
            <Link to="/profile/mfa" className="btn btn-secondary">
              {t('profile.mfa_configure')}
            </Link>
          </section>
        )}

        {/* SSO Section */}
        {isActive('sso') && (
          <section className="unified-card card-padded sso-profile-section reveal-up" ref={ssoRef} aria-labelledby="profile-sso-title">
            <h2 className="title-sm" id="profile-sso-title">{t('profile.section_sso')}</h2>
            <p className="text-secondary">
              {t('profile.sso_description')}
            </p>
            <Suspense fallback={null}>
              <SSOAccountLinks />
            </Suspense>
          </section>
        )}

        {/* Preferences Section */}
        {isActive('preference') ? (
          <section className="unified-card card-padded reveal-up" ref={prefsRef} aria-labelledby="profile-prefs-title">
            <h2 className="title-sm" id="profile-prefs-title">{t('profile.section_preferences')}</h2>
            <p className="text-secondary">
              {t('profile.preferences_description')}
            </p>
            <Link to="/profile/preferences" className="btn btn-secondary">
              {t('profile.preferences_manage')}
            </Link>
          </section>
        ) : (
          <section className="unified-card card-padded reveal-up" ref={prefsRef} aria-labelledby="profile-prefs-title-fallback">
            <h2 className="title-sm" id="profile-prefs-title-fallback">{t('profile.section_preferences')}</h2>
            <fieldset className="form-group">
              <legend className="sr-only">{t('profile.theme_label')}</legend>
              <label>{t('profile.theme_label')}</label>
              <div className="flex-row" role="group" aria-label={t('profile.theme_label')}>
                <button
                  className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleThemeChange('light')}
                  type="button"
                  aria-pressed={currentTheme === 'light'}
                >
                  {t('profile.theme_light')}
                </button>
                <button
                  className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleThemeChange('dark')}
                  type="button"
                  aria-pressed={currentTheme === 'dark'}
                >
                  {t('profile.theme_dark')}
                </button>
              </div>
            </fieldset>
          </section>
        )}
      </div>
    </Layout>
  )
}
