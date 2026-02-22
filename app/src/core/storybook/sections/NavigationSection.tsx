import { useTranslation } from 'react-i18next'

export default function NavigationSection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('navigation_title')}</h2>

      <h3>{t('navigation_breadcrumb_title')}</h3>
      <div className="storybook-preview">
        <nav className="breadcrumb">
          <a className="breadcrumb-link" href="#storybook">{t('navigation_breadcrumb_home')}</a>
          <span className="breadcrumb-separator">/</span>
          <a className="breadcrumb-link" href="#storybook">{t('navigation_breadcrumb_admin')}</a>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{t('navigation_breadcrumb_current')}</span>
        </nav>
      </div>

      <h3>{t('navigation_multiselect_title')}</h3>
      <div className="storybook-preview">
        <div className="multi-select-container">
          <div className="multi-select-trigger">
            <span className="badge badge-info">{t('navigation_multiselect_editor')}</span>
            <span className="badge badge-info">{t('navigation_multiselect_viewer')}</span>
          </div>
        </div>
      </div>

      <h3>{t('navigation_searchselect_title')}</h3>
      <div className="storybook-preview">
        <div className="search-select">
          <div className="search-select-trigger">
            <span>{t('navigation_searchselect_value')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      <h3>{t('navigation_searchselect_placeholder_title')}</h3>
      <div className="storybook-preview">
        <div className="search-select">
          <div className="search-select-trigger">
            <span className="search-select-placeholder">{t('navigation_searchselect_placeholder')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
