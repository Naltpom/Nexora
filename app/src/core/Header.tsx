import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useAuth } from './AuthContext'
import { useFeature } from './FeatureContext'
import { useAppSettings } from './AppSettingsContext'
import { useNavigate, Link } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'

const NotificationBell = lazy(() => import('../features/notification/NotificationBell'))

export default function Header() {
  const { user, logout, getPreference, updatePreference } = useAuth()
  const { isActive } = useFeature()
  const { settings: appSettings } = useAppSettings()
  const navigate = useNavigate()
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const adminDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const theme = getPreference('theme', 'light')

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', newTheme)
    updatePreference('theme', newTheme)
  }

  const avatarInitial = user?.first_name?.charAt(0).toUpperCase() || '?'
  const avatarColor = '#3B82F6'

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="header-logo" style={{ cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ backgroundColor: appSettings.primary_color || '#1E40AF', borderRadius: '6px', padding: '6px 10px', display: 'flex', alignItems: 'center', height: '36px', boxSizing: 'border-box' }}>
            <img src={appSettings.app_logo || '/logo_full.svg'} alt={appSettings.app_name} style={{ height: '18px', display: 'block' }} />
          </div>
          <span className="header-title">{appSettings.app_name}</span>
        </Link>
        {user && <GlobalSearch />}
      </div>
      <div className="header-right">
        {user && (
          <>
            <button
              className="header-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {isActive('notification') && (
              <Suspense fallback={null}>
                <NotificationBell />
              </Suspense>
            )}

            {/* Non-admin user */}
            {!user.is_super_admin && (
              <>
                <Link
                  to="/profile"
                  className="header-user-name"
                  style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  title="Mon profil"
                >
                  {user.first_name} {user.last_name?.toUpperCase()}
                </Link>

                <button
                  className="header-logout-btn"
                  onClick={handleLogout}
                  title="Deconnexion"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </>
            )}

            {/* Admin user */}
            {user.is_super_admin && (
              <div className="header-admin-dropdown" ref={adminDropdownRef}>
                <button
                  className="header-admin-trigger"
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                >
                  <div
                    className="header-avatar"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {avatarInitial}
                  </div>
                  <span className="header-user-name">{user.first_name}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`header-admin-chevron ${showAdminMenu ? 'open' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showAdminMenu && (
                  <div className="header-admin-menu">
                    <div className="header-admin-menu-header">
                      <div className="header-admin-menu-name">
                        {user.first_name} {user.last_name}
                      </div>
                    </div>

                    <div className="header-admin-menu-separator" />

                    <Link
                      to="/profile"
                      className="header-admin-menu-item"
                      onClick={() => setShowAdminMenu(false)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Mon profil
                    </Link>
                    {isActive('preference') && (
                      <Link
                        to="/profile/preferences"
                        className="header-admin-menu-item"
                        onClick={() => setShowAdminMenu(false)}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Preferences
                      </Link>
                    )}

                    <div className="header-admin-menu-separator" />

                    <div className="header-admin-menu-section-label">Administration</div>
                    <Link
                      to="/admin/users"
                      className="header-admin-menu-item"
                      onClick={() => setShowAdminMenu(false)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Utilisateurs
                    </Link>
                    {isActive('notification') && (
                      <Link
                        to="/notifications/settings"
                        className="header-admin-menu-item"
                        onClick={() => setShowAdminMenu(false)}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        Notifications
                      </Link>
                    )}
                    <Link
                      to="/admin/roles"
                      className="header-admin-menu-item"
                      onClick={() => setShowAdminMenu(false)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Roles
                    </Link>
                    <Link
                      to="/admin/permissions"
                      className="header-admin-menu-item"
                      onClick={() => setShowAdminMenu(false)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Permissions
                    </Link>
                    <Link
                      to="/admin/features"
                      className="header-admin-menu-item"
                      onClick={() => setShowAdminMenu(false)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      Features
                    </Link>
                    {isActive('event') && (
                      <Link
                        to="/admin/events"
                        className="header-admin-menu-item"
                        onClick={() => setShowAdminMenu(false)}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        Events
                      </Link>
                    )}
                    {isActive('mfa') && (
                      <Link
                        to="/admin/mfa-policy"
                        className="header-admin-menu-item"
                        onClick={() => setShowAdminMenu(false)}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          <circle cx="12" cy="16" r="1" />
                        </svg>
                        Politique MFA
                      </Link>
                    )}
                    <Link
                      to="/admin/settings"
                      className="header-admin-menu-item"
                      onClick={() => setShowAdminMenu(false)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      Parametres
                    </Link>
                    <Link
                      to="/admin/database"
                      className="header-admin-menu-item"
                      onClick={() => setShowAdminMenu(false)}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                      </svg>
                      Base de donnees
                    </Link>

                    <div className="header-admin-menu-separator" />

                    <div
                      className="header-admin-menu-item header-admin-menu-item-danger"
                      onClick={() => { handleLogout(); setShowAdminMenu(false) }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Deconnexion
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  )
}
