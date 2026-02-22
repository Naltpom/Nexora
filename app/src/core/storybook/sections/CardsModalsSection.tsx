import { useTranslation } from 'react-i18next'

export default function CardsModalsSection() {
  const { t } = useTranslation('storybook')

  return (
    <div className="storybook-section">
      <h2>{t('cards_title')}</h2>

      <h3>{t('cards_basic_title')}</h3>
      <div className="storybook-preview">
        <div className="card">
          <div className="card-header">
            <strong>{t('cards_basic_header')}</strong>
          </div>
          <div className="card-body">
            <p>
              {t('cards_basic_body')}
            </p>
          </div>
        </div>
      </div>

      <h3>{t('cards_unified_title')}</h3>
      <div className="storybook-preview">
        <div className="unified-card">
          <div className="unified-card-header">
            <h2>{t('cards_unified_header')}</h2>
          </div>
          <div className="card-body">
            <p>
              {t('cards_unified_body')}
            </p>
          </div>
        </div>
      </div>

      <h3>{t('cards_modals_title')}</h3>

      <div className="storybook-label">{t('cards_modal_info_label')}</div>
      <div className="storybook-preview">
        <div className="confirm-modal">
          <div className="confirm-modal-header confirm-modal-info">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <h3>{t('cards_modal_info_title')}</h3>
          </div>
          <div className="confirm-modal-body">
            <p>
              {t('cards_modal_info_body')}
            </p>
          </div>
          <div className="confirm-modal-footer">
            <button className="btn btn-secondary" type="button">
              {t('cards_modal_info_dismiss')}
            </button>
            <button className="btn btn-primary" type="button">
              {t('cards_modal_info_confirm')}
            </button>
          </div>
        </div>
      </div>

      <div className="storybook-label">{t('cards_modal_warning_label')}</div>
      <div className="storybook-preview">
        <div className="confirm-modal">
          <div className="confirm-modal-header confirm-modal-warning">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3>{t('cards_modal_warning_title')}</h3>
          </div>
          <div className="confirm-modal-body">
            <p>
              {t('cards_modal_warning_body')}
            </p>
          </div>
          <div className="confirm-modal-footer">
            <button className="btn btn-secondary" type="button">
              {t('cards_modal_warning_cancel')}
            </button>
            <button className="btn btn-warning" type="button">
              {t('cards_modal_warning_confirm')}
            </button>
          </div>
        </div>
      </div>

      <div className="storybook-label">{t('cards_modal_danger_label')}</div>
      <div className="storybook-preview">
        <div className="confirm-modal">
          <div className="confirm-modal-header confirm-modal-danger">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h3>{t('cards_modal_danger_title')}</h3>
          </div>
          <div className="confirm-modal-body">
            <p>
              {t('cards_modal_danger_body')}
            </p>
          </div>
          <div className="confirm-modal-footer">
            <button className="btn btn-secondary" type="button">
              {t('cards_modal_danger_cancel')}
            </button>
            <button className="btn btn-danger" type="button">
              {t('cards_modal_danger_confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
