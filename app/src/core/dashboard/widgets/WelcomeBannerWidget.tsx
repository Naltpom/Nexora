import { useTranslation } from 'react-i18next'
import { useAuth } from '../../AuthContext'

export default function WelcomeBannerWidget({ widgetId: _widgetId, size: _size }: { widgetId: string; size: string }) {
  const { t } = useTranslation('dashboard')
  const { user } = useAuth()

  const showBanner = !user?.last_login

  if (!showBanner) {
    return (
      <aside className="home-welcome-banner" role="status" aria-labelledby="dashboard-welcome-title">
        <div className="home-welcome-banner-title" id="dashboard-welcome-title">{t('welcome_back_title')}</div>
        <p className="home-welcome-banner-text">{t('welcome_back_text')}</p>
      </aside>
    )
  }

  return (
    <aside className="home-welcome-banner" role="status" aria-labelledby="dashboard-welcome-title">
      <div className="home-welcome-banner-title" id="dashboard-welcome-title">{t('welcome_banner_title')}</div>
      <p className="home-welcome-banner-text">{t('welcome_banner_text')}</p>
    </aside>
  )
}
