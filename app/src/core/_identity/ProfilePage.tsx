import { useState, FormEvent, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
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
      setInfoMessage('Informations mises a jour avec succes')
    } catch (err: any) {
      setInfoError(err.response?.data?.detail || 'Erreur lors de la sauvegarde')
    } finally {
      setInfoSaving(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwdError('')
    setPwdMessage('')

    if (newPassword.length < 6) {
      setPwdError('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Les mots de passe ne correspondent pas')
      return
    }

    setPwdSaving(true)
    try {
      await api.put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPwdMessage('Mot de passe modifie avec succes')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPwdError(err.response?.data?.detail || 'Erreur lors du changement de mot de passe')
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
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Mon profil' }]} title="Mon profil">
      <div className="page-narrow">
        {/* User Info Section */}
        <div className="unified-card card-padded reveal-up" ref={infoRef}>
          <h2 className="title-sm">Informations personnelles</h2>
          <form onSubmit={handleSaveInfo}>
            {infoError && <div className="alert alert-error alert-spaced">{infoError}</div>}
            {infoMessage && <div className="alert alert-success alert-spaced">{infoMessage}</div>}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label>Prenom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={infoSaving}>
              {infoSaving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="unified-card card-padded reveal-up" ref={passwordRef}>
          <h2 className="title-sm">Changer le mot de passe</h2>
          <form onSubmit={handleChangePassword}>
            {pwdError && <div className="alert alert-error alert-spaced">{pwdError}</div>}
            {pwdMessage && <div className="alert alert-success alert-spaced">{pwdMessage}</div>}

            <div className="form-group">
              <label>Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caracteres"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
              {pwdSaving ? 'Modification...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>

        {/* MFA Section */}
        {isActive('mfa') && (
          <div className="unified-card card-padded reveal-up" ref={mfaRef}>
            <div className="flex-between mb-16">
              <h2 className="title-sm mb-0">Authentification multi-facteurs (MFA)</h2>
              <Suspense fallback={null}>
                <MFAStatusBadge />
              </Suspense>
            </div>
            <p className="text-secondary">
              Renforcez la securite de votre compte en activant une methode de verification supplementaire.
            </p>
            <Link to="/profile/mfa" className="btn btn-secondary">
              Configurer MFA
            </Link>
          </div>
        )}

        {/* SSO Section */}
        {isActive('sso') && (
          <div className="unified-card card-padded sso-profile-section reveal-up" ref={ssoRef}>
            <h2 className="title-sm">Comptes lies</h2>
            <p className="text-secondary">
              Liez vos comptes externes pour vous connecter plus rapidement.
            </p>
            <Suspense fallback={null}>
              <SSOAccountLinks />
            </Suspense>
          </div>
        )}

        {/* Preferences Section */}
        {isActive('preference') ? (
          <div className="unified-card card-padded reveal-up" ref={prefsRef}>
            <h2 className="title-sm">Preferences</h2>
            <p className="text-secondary">
              Gerez vos preferences de theme, tutoriels, et plus.
            </p>
            <Link to="/profile/preferences" className="btn btn-secondary">
              Gerer les preferences
            </Link>
          </div>
        ) : (
          <div className="unified-card card-padded reveal-up" ref={prefsRef}>
            <h2 className="title-sm">Preferences</h2>
            <div className="form-group">
              <label>Theme</label>
              <div className="flex-row">
                <button
                  className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleThemeChange('light')}
                  type="button"
                >
                  Clair
                </button>
                <button
                  className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleThemeChange('dark')}
                  type="button"
                >
                  Sombre
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
