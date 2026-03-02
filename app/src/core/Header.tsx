import { lazy, Suspense } from 'react'
import { useAuth } from './AuthContext'
import { useAppSettings } from './AppSettingsContext'
import { useFeature } from './FeatureContext'
import { Link } from 'react-router-dom'
import { HeaderSearchTrigger } from './search/HeaderSearchTrigger'
import { UserMenu } from './navigation'

const NotificationBell = lazy(() => import('./notification/NotificationBell'))
const AnnouncementButton = lazy(() => import('./announcement/AnnouncementButton'))
const FavoriteButton = lazy(() => import('./favorite/FavoriteButton'))

export default function Header() {
  const { user } = useAuth()
  const { isActive } = useFeature()
  const { settings: appSettings } = useAppSettings()

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
        {user && isActive('search') && <HeaderSearchTrigger />}
      </div>
      <div className="header-right">
        {user && (
          <>
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
