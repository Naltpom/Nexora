import { useTranslation } from 'react-i18next'

export default function MiscSection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('misc_title')}</h2>

      <h3>{t('misc_spinner_title')}</h3>
      <div className="storybook-preview">
        <div className="loading-screen" aria-label={t('misc_spinner_aria_label')}>
          <div className="spinner" />
          {t('misc_spinner_text')}
        </div>
      </div>

      <h3>{t('misc_skeleton_title')}</h3>
      <div className="storybook-preview">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-card" />
      </div>

      <h3>{t('misc_changes_bar_title')}</h3>
      <div className="storybook-preview">
        <div className="changes-bar">
          <span className="changes-bar-text">{t('misc_changes_bar_text')}</span>
          <div className="changes-bar-actions">
            <button className="btn btn-secondary" type="button">{t('misc_changes_bar_cancel')}</button>
            <button className="btn btn-primary" type="button">{t('misc_changes_bar_save')}</button>
          </div>
        </div>
      </div>

      <h3>{t('misc_changes_bar_unified_title')}</h3>
      <div className="storybook-preview">
        <div className="unified-changes-bar">
          <span className="unified-changes-bar-text">
            <span className="unified-changes-bar-dot" />
            {t('misc_changes_bar_unified_text')}
          </span>
          <div className="unified-changes-bar-actions">
            <button className="btn-unified-secondary" type="button">{t('misc_changes_bar_unified_cancel')}</button>
            <button className="btn-unified-primary" type="button">{t('misc_changes_bar_unified_save')}</button>
          </div>
        </div>
      </div>

      <h3>{t('misc_toggles_title')}</h3>
      <div className="storybook-preview">
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider" />
          </label>
          <span>{t('misc_toggle_notifications_on')}</span>
        </div>
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" />
            <span className="toggle-slider" />
          </label>
          <span>{t('misc_toggle_maintenance')}</span>
        </div>
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" defaultChecked disabled />
            <span className="toggle-slider" />
          </label>
          <span>{t('misc_toggle_security_locked')}</span>
        </div>
        <div className="storybook-row">
          <label className="toggle">
            <input type="checkbox" disabled />
            <span className="toggle-slider" />
          </label>
          <span>{t('misc_toggle_feature_disabled')}</span>
        </div>
      </div>
    </div>
  )
}
