import { useTranslation } from 'react-i18next'

export default function TablesSection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('tables_title')}</h2>

      <h3>{t('tables_basic_title')}</h3>
      <div className="storybook-preview">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="th-sortable">
                  {t('tables_th_name')} <span className="sort-indicator">&#9650;</span>
                </th>
                <th className="th-sortable">
                  {t('tables_th_email')} <span className="sort-indicator">&#9660;</span>
                </th>
                <th>{t('tables_th_role')}</th>
                <th>{t('tables_th_status')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="user-me">{t('tables_user_marie')}</span></td>
                <td>{t('tables_email_marie')}</td>
                <td>{t('tables_role_admin')}</td>
                <td><span className="badge badge-success">{t('tables_status_active')}</span></td>
              </tr>
              <tr>
                <td>{t('tables_user_jean')}</td>
                <td>{t('tables_email_jean')}</td>
                <td>{t('tables_role_editor')}</td>
                <td><span className="badge badge-success">{t('tables_status_active')}</span></td>
              </tr>
              <tr>
                <td>{t('tables_user_sophie')}</td>
                <td>{t('tables_email_sophie')}</td>
                <td>{t('tables_role_viewer')}</td>
                <td><span className="badge badge-warning">{t('tables_status_pending')}</span></td>
              </tr>
              <tr>
                <td>{t('tables_user_pierre')}</td>
                <td>{t('tables_email_pierre')}</td>
                <td>{t('tables_role_editor')}</td>
                <td><span className="badge badge-error">{t('tables_status_inactive')}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3>{t('tables_unified_title')}</h3>
      <div className="storybook-preview">
        <div className="unified-card">
          <div className="unified-page-header">
            <div className="unified-page-header-info">
              <h1>{t('tables_unified_header')}</h1>
              <p>{t('tables_unified_description')}</p>
            </div>
            <div className="unified-page-header-actions">
              <button className="btn-unified-primary" type="button">
                {t('tables_unified_add_button')}
              </button>
            </div>
          </div>

          <div className="unified-search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder={t('tables_unified_search_placeholder')} readOnly />
          </div>

          <div className="card-table">
            <table className="unified-table">
              <thead>
                <tr>
                  <th className="th-sortable">{t('tables_th_name')}</th>
                  <th className="th-sortable">{t('tables_th_email')}</th>
                  <th>{t('tables_th_role')}</th>
                  <th>{t('tables_th_status')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="user-me">{t('tables_user_marie')}</span></td>
                  <td>{t('tables_email_marie')}</td>
                  <td>{t('tables_role_admin')}</td>
                  <td><span className="badge badge-success">{t('tables_status_active')}</span></td>
                </tr>
                <tr>
                  <td>{t('tables_user_jean')}</td>
                  <td>{t('tables_email_jean')}</td>
                  <td>{t('tables_role_editor')}</td>
                  <td><span className="badge badge-success">{t('tables_status_active')}</span></td>
                </tr>
                <tr>
                  <td>{t('tables_user_sophie')}</td>
                  <td>{t('tables_email_sophie')}</td>
                  <td>{t('tables_role_viewer')}</td>
                  <td><span className="badge badge-warning">{t('tables_status_pending')}</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="unified-pagination">
            <span className="unified-pagination-info">
              {t('tables_unified_pagination_info')}
            </span>
            <div className="unified-pagination-controls">
              <button className="unified-pagination-btn" type="button" disabled>
                &laquo;
              </button>
              <button className="unified-pagination-btn active" type="button">
                1
              </button>
              <button className="unified-pagination-btn" type="button">
                2
              </button>
              <button className="unified-pagination-btn" type="button">
                3
              </button>
              <span className="unified-pagination-dots">...</span>
              <button className="unified-pagination-btn" type="button">
                4
              </button>
              <button className="unified-pagination-btn" type="button">
                &raquo;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
