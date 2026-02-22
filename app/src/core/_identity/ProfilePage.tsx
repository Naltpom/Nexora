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
      await api.put('/users/me', {
        first_name: firstName,
        last_name: lastName,
        email,
      })
      await refreshUser()
      setInfoMessage(t('profile.info_success'))
    } catch (err: any) {
      setInfoError(err.response?.data?.detail || t('profile.info_error'))
    } finally {
      setInfoSaving(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdMessage('')

    if (newPassword.length < 6) {
      setPwdError(t('profile.password_min_6_error'))
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
      setPwdError(err.response?.data?.detail || t('profile.password_error'))
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
        {/* User Info Section */}
        <div className="unified-card card-padded reveal-up" ref={infoRef}>
          <h2 className="title-sm">{t('profile.section_personal_info')}</h2>
          <form onSubmit={handleSaveInfo}>
            {infoError && <div className="alert alert-error alert-spaced">{infoError}</div>}
            {infoMessage && <div className="alert alert-success alert-spaced">{infoMessage}</div>}

            <div className="form-group">
              <label>{t('common.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label>{t('common.first_name')}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('common.last_name')}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={infoSaving}>
              {infoSaving ? t('profile.saving') : t('profile.save')}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="unified-card card-padded reveal-up" ref={passwordRef}>
          <h2 className="title-sm">{t('profile.section_change_password')}</h2>
          <form onSubmit={handleChangePassword}>
            {pwdError && <div className="alert alert-error alert-spaced">{pwdError}</div>}
            {pwdMessage && <div className="alert alert-success alert-spaced">{pwdMessage}</div>}

            <div className="form-group">
              <label>{t('common.current_password')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('common.new_password')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('common.password_min_6')}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('common.confirm_new_password')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
              {pwdSaving ? t('profile.password_submitting') : t('profile.password_submit')}
            </button>
          </form>
        </div>

        {/* MFA Section */}
        {isActive('mfa') && (
          <div className="unified-card card-padded reveal-up" ref={mfaRef}>
            <div className="flex-between mb-16">
              <h2 className="title-sm mb-0">{t('profile.section_mfa')}</h2>
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
          </div>
        )}

        {/* SSO Section */}
        {isActive('sso') && (
          <div className="unified-card card-padded sso-profile-section reveal-up" ref={ssoRef}>
            <h2 className="title-sm">{t('profile.section_sso')}</h2>
            <p className="text-secondary">
              {t('profile.sso_description')}
            </p>
            <Suspense fallback={null}>
              <SSOAccountLinks />
            </Suspense>
          </div>
        )}

        {/* Preferences Section */}
        {isActive('preference') ? (
          <div className="unified-card card-padded reveal-up" ref={prefsRef}>
            <h2 className="title-sm">{t('profile.section_preferences')}</h2>
            <p className="text-secondary">
              {t('profile.preferences_description')}
            </p>
            <Link to="/profile/preferences" className="btn btn-secondary">
              {t('profile.preferences_manage')}
            </Link>
          </div>
        ) : (
          <div className="unified-card card-padded reveal-up" ref={prefsRef}>
            <h2 className="title-sm">{t('profile.section_preferences')}</h2>
            <div className="form-group">
              <label>{t('profile.theme_label')}</label>
              <div className="flex-row">
                <button
                  className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleThemeChange('light')}
                  type="button"
                >
                  {t('profile.theme_light')}
                </button>
                <button
                  className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleThemeChange('dark')}
                  type="button"
                >
                  {t('profile.theme_dark')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
