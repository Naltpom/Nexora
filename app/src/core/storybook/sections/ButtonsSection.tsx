import { useTranslation } from 'react-i18next'

export default function ButtonsSection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('buttons_title')}</h2>

      <h3>{t('buttons_standard_title')}</h3>
      <div className="storybook-row">
        <button className="btn btn-primary" type="button">
          {t('buttons_primary')}
        </button>
        <button className="btn btn-secondary" type="button">
          {t('buttons_secondary')}
        </button>
        <button className="btn btn-danger" type="button">
          {t('buttons_danger')}
        </button>
        <button className="btn btn-success" type="button">
          {t('buttons_success')}
        </button>
        <button className="btn btn-warning" type="button">
          {t('buttons_warning')}
        </button>
      </div>

      <h3>{t('buttons_small_title')}</h3>
      <div className="storybook-row">
        <button className="btn btn-sm btn-primary" type="button">
          {t('buttons_primary_sm')}
        </button>
        <button className="btn btn-sm btn-secondary" type="button">
          {t('buttons_secondary_sm')}
        </button>
        <button className="btn btn-sm btn-danger" type="button">
          {t('buttons_danger_sm')}
        </button>
        <button className="btn btn-sm btn-success" type="button">
          {t('buttons_success_sm')}
        </button>
        <button className="btn btn-sm btn-warning" type="button">
          {t('buttons_warning_sm')}
        </button>
      </div>

      <h3>{t('buttons_block_title')}</h3>
      <div className="storybook-preview">
        <button className="btn btn-block btn-primary" type="button">
          {t('buttons_save_changes')}
        </button>
      </div>

      <h3>{t('buttons_disabled_title')}</h3>
      <div className="storybook-row">
        <button className="btn btn-primary" type="button" disabled>
          {t('buttons_primary_disabled')}
        </button>
        <button className="btn btn-secondary" type="button" disabled>
          {t('buttons_secondary_disabled')}
        </button>
        <button className="btn btn-danger" type="button" disabled>
          {t('buttons_danger_disabled')}
        </button>
        <button className="btn btn-success" type="button" disabled>
          {t('buttons_success_disabled')}
        </button>
      </div>

      <h3>{t('buttons_icon_title')}</h3>
      <div className="storybook-row">
        <button className="btn-icon btn-icon-secondary" type="button" title={t('buttons_icon_edit_title')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-primary" type="button" title={t('buttons_icon_add_title')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-danger" type="button" title={t('buttons_icon_delete_title')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
        <button className="btn-icon btn-icon-active" type="button" title={t('buttons_icon_active_title')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
      <div className="storybook-label">
        {t('buttons_icon_label')}
      </div>

      <h3>{t('buttons_unified_title')}</h3>
      <div className="storybook-row">
        <button className="btn-unified-primary" type="button">
          {t('buttons_create_user')}
        </button>
        <button className="btn-unified-secondary" type="button">
          {t('buttons_cancel')}
        </button>
      </div>
      <div className="storybook-row">
        <button className="btn-unified-primary" type="button" disabled>
          {t('buttons_unified_primary_disabled')}
        </button>
        <button className="btn-unified-secondary" type="button" disabled>
          {t('buttons_unified_secondary_disabled')}
        </button>
      </div>
    </div>
  )
}
