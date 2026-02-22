import { useTranslation } from 'react-i18next'

export default function BadgesSection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('badges_title')}</h2>

      <h3>{t('badges_generic_title')}</h3>
      <div className="storybook-row">
        <span className="badge badge-secondary">{t('badges_secondary')}</span>
        <span className="badge badge-success">{t('badges_success')}</span>
        <span className="badge badge-warning">{t('badges_warning')}</span>
        <span className="badge badge-error">{t('badges_error')}</span>
        <span className="badge badge-info">{t('badges_info')}</span>
      </div>

      <h3>{t('badges_active_title')}</h3>
      <div className="storybook-row">
        <span className="badge-active badge-active-on">{t('badges_active_on')}</span>
        <span className="badge-active badge-active-off">{t('badges_active_off')}</span>
      </div>

      <h3>{t('badges_admin_title')}</h3>
      <div className="storybook-row">
        <span className="badge-admin badge-admin-on">{t('badges_admin_on')}</span>
        <span className="badge-admin badge-admin-off">{t('badges_admin_off')}</span>
      </div>

      <h3>{t('badges_status_title')}</h3>
      <div className="storybook-row">
        <span className="badge-status badge-status-online">{t('badges_status_online')}</span>
        <span className="badge-status badge-status-away">{t('badges_status_away')}</span>
        <span className="badge-status badge-status-offline">{t('badges_status_offline')}</span>
      </div>

      <h3>{t('badges_alerts_title')}</h3>
      <div className="storybook-preview">
        <div className="alert alert-error">
          {t('badges_alert_error')}
        </div>
        <div className="alert alert-success">
          {t('badges_alert_success')}
        </div>
      </div>
    </div>
  )
}
