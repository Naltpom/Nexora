import { useTranslation } from 'react-i18next'
import type { PreferenceChange } from './DraftPreferenceContext'
import './unsavedChangesModal.scss'

interface UnsavedChangesModalProps {
  changes: PreferenceChange[]
  onSaveAndLeave: () => void
  onDiscardAndLeave: () => void
  onCancel: () => void
}

export default function UnsavedChangesModal({
  changes,
  onSaveAndLeave,
  onDiscardAndLeave,
  onCancel,
}: UnsavedChangesModalProps) {
  const { t } = useTranslation('preference')
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal unsaved-modal" onClick={(e) => e.stopPropagation()}>
        <div className="unsaved-modal__header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <h3>{t('modal_title')}</h3>
        </div>

        <div className="unsaved-modal__body">
          <p>{t('modal_description')}</p>
          <div className="unsaved-modal__changes">
            {changes.map((change) => (
              <div key={change.key} className="unsaved-modal__change-item">
                <span className="unsaved-modal__change-label">{change.label}</span>
                <div className="unsaved-modal__change-values">
                  <span className="unsaved-modal__old-value">{change.oldDisplay}</span>
                  <svg className="unsaved-modal__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                  <span className="unsaved-modal__new-value">{change.newDisplay}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="unsaved-modal__footer">
          <button className="btn btn-secondary" onClick={onDiscardAndLeave} type="button">
            {t('modal_btn_discard')}
          </button>
          <button className="btn btn-primary" onClick={onSaveAndLeave} type="button">
            {t('modal_btn_save_and_leave')}
          </button>
        </div>
      </div>
    </div>
  )
}
