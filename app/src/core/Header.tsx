import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import { useFeature } from './FeatureContext'
import { useAppSettings } from './AppSettingsContext'
import { Link } from 'react-router-dom'
import GlobalSearch from './GlobalSearch'
import { applyCustomColors } from './preference/couleur/applyCustomColors'
import { UserMenu } from './navigation'

const NotificationBell = lazy(() => import('./notification/NotificationBell'))
const AnnouncementButton = lazy(() => import('./announcement/AnnouncementButton'))
const FavoriteButton = lazy(() => import('./favorite/FavoriteButton'))

export default function Header() {
  const { t } = useTranslation('common')
  const { user, getPreference, updatePreference } = useAuth()
  const { isActive } = useFeature()
  const { settings: appSettings } = useAppSettings()

  const theme = getPreference('theme', 'light')

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', newTheme)
    updatePreference('theme', newTheme)
    const customColors = getPreference('customColors', null)
    applyCustomColors(customColors, newTheme)
  }

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="header-logo">
          {appSettings.header_show_logo !== 'false' && (
            <div className="header-logo-icon" style={{ '--header-logo-bg': appSettings.primary_color || '#1E40AF' } as React.CSSProperties}>
              <img src={appSettings.app_logo || '/logo_full.svg'} alt={appSettings.app_name} className="header-logo-img" />
            </div>
          )}
          {appSettings.header_show_name !== 'false' && (
            <span className="header-title">{appSettings.app_name}</span>
          )}
        </Link>
        {user && <GlobalSearch />}
      </div>
      <div className="header-right">
        {user && (
          <>
            <button
              className="header-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
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

            {isActive('announcement') && (
              <Suspense fallback={null}>
                <AnnouncementButton />
              </Suspense>
            )}

            {isActive('favorite') && (
              <Suspense fallback={null}>
                <FavoriteButton />
              </Suspense>
            )}

            <UserMenu />
          </>
        )}
      </div>
    </header>
  )
}
