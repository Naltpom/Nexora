import { useTranslation } from 'react-i18next'

interface DashboardEditBarProps {
  onAddWidget: () => void
  onSave: () => void
  onCancel: () => void
  onReset: () => void
  saving: boolean
}

export default function DashboardEditBar({
  onAddWidget,
  onSave,
  onCancel,
  onReset,
  saving,
}: DashboardEditBarProps) {
  const { t } = useTranslation('dashboard')

  return (
    <div className="dashboard-edit-bar" role="toolbar" aria-label={t('edit_toolbar')}>
      <div className="dashboard-edit-bar-left">
        <button className="btn btn-secondary btn-sm" onClick={onAddWidget}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('add_widget')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={saving}>
          {t('reset')}
        </button>
      </div>
      <div className="dashboard-edit-bar-right">
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          {t('common:cancel')}
        </button>
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? (
            <div className="spinner spinner-sm" aria-hidden="true" />
          ) : null}
          {t('common:save')}
        </button>
      </div>
    </div>
  )
}
