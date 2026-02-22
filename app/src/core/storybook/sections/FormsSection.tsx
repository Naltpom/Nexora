import { useTranslation } from 'react-i18next'

export default function FormsSection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('forms_title')}</h2>

      <h3>{t('forms_basic_title')}</h3>
      <div className="storybook-preview">
        <div className="form-group">
          <label>{t('forms_label_fullname')}</label>
          <input type="text" placeholder={t('forms_placeholder_fullname')} />
        </div>
        <div className="form-group">
          <label>{t('forms_label_email')}</label>
          <input type="email" placeholder={t('forms_placeholder_email')} />
        </div>
      </div>

      <h3>{t('forms_select_title')}</h3>
      <div className="storybook-preview">
        <div className="form-group">
          <label>{t('forms_label_role')}</label>
          <select defaultValue="">
            <option value="" disabled>
              {t('forms_placeholder_role')}
            </option>
            <option value="admin">{t('forms_option_admin')}</option>
            <option value="editor">{t('forms_option_editor')}</option>
            <option value="viewer">{t('forms_option_viewer')}</option>
          </select>
        </div>
      </div>

      <h3>{t('forms_textarea_title')}</h3>
      <div className="storybook-preview">
        <div className="form-group">
          <label>{t('forms_label_description')}</label>
          <textarea
            rows={4}
            placeholder={t('forms_placeholder_description')}
          />
        </div>
      </div>

      <h3>{t('forms_row_title')}</h3>
      <div className="storybook-preview">
        <div className="form-row">
          <div className="form-group">
            <label>{t('forms_label_firstname')}</label>
            <input type="text" placeholder={t('forms_placeholder_firstname')} />
          </div>
          <div className="form-group">
            <label>{t('forms_label_lastname')}</label>
            <input type="text" placeholder={t('forms_placeholder_lastname')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('forms_label_city')}</label>
            <input type="text" placeholder={t('forms_placeholder_city')} />
          </div>
          <div className="form-group">
            <label>{t('forms_label_zipcode')}</label>
            <input type="text" placeholder={t('forms_placeholder_zipcode')} />
          </div>
        </div>
      </div>

      <h3>{t('forms_toggle_title')}</h3>
      <div className="storybook-preview">
        <div className="storybook-inline-demo">
          <label className="toggle">
            <input type="checkbox" defaultChecked={false} />
            <span className="toggle-slider" />
          </label>
          <span>{t('forms_toggle_email_off')}</span>
        </div>
        <div className="storybook-inline-demo">
          <label className="toggle">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider" />
          </label>
          <span>{t('forms_toggle_dark_on')}</span>
        </div>
        <div className="storybook-inline-demo">
          <label className="toggle">
            <input type="checkbox" disabled />
            <span className="toggle-slider" />
          </label>
          <span>{t('forms_toggle_locked')}</span>
        </div>
      </div>

      <h3>{t('forms_search_title')}</h3>
      <div className="storybook-preview">
        <div className="search-box">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input type="text" placeholder={t('forms_search_placeholder')} />
        </div>
      </div>
    </div>
  )
}
