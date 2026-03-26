import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../Layout'
import { useAuth } from '../AuthContext'
import { useDashboard } from './useDashboard'
import DashboardGrid from './DashboardGrid'
import DashboardEditBar from './DashboardEditBar'
import WidgetCatalog from './WidgetCatalog'
import './dashboard.scss'

export default function DashboardPage() {
  const { t, i18n } = useTranslation('dashboard')
  const { user } = useAuth()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const dashboard = useDashboard()

  const today = useMemo(() =>
    new Date().toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    [i18n.language]
  )

  if (dashboard.loading) {
    return (
      <Layout title={t('page_title')}>
        <div className="loading-screen" aria-busy="true">
          <div className="spinner" role="status">
            <span className="sr-only">{t('common:loading')}</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('page_title')} fullWidth={dashboard.fullWidth}>
      <div className="dashboard-page">
        {/* Header */}
        <section className="dashboard-header" aria-labelledby="dashboard-greeting">
          <div className="dashboard-header-content">
            <div>
              <h1 className="title-lg" id="dashboard-greeting">
                {t('greeting', { name: user?.first_name })}
              </h1>
              <p className="text-gray-500">{today}</p>
            </div>
            {!dashboard.editMode && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={dashboard.enterEditMode}
                aria-label={t('edit_mode')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {t('customize')}
              </button>
            )}
          </div>
        </section>

        {/* Edit bar */}
        {dashboard.editMode && (
          <DashboardEditBar
            onAddWidget={() => setCatalogOpen(true)}
            onAddSpacer={() => dashboard.addWidget('spacer', 'col-6')}
            onSave={dashboard.saveLayout}
            onCancel={dashboard.cancelEdit}
            onReset={dashboard.resetLayout}
            onToggleFullWidth={dashboard.toggleFullWidth}
            fullWidth={dashboard.fullWidth}
            saving={dashboard.saving}
          />
        )}

        {/* Grid */}
        <DashboardGrid
          widgets={dashboard.activeWidgets}
          editMode={dashboard.editMode}
          onMove={dashboard.moveWidget}
          onRemove={dashboard.removeWidget}
          onResize={dashboard.resizeWidget}
          onResizeHeight={dashboard.resizeWidgetHeight}
        />

        {/* Widget catalog modal */}
        {catalogOpen && (
          <WidgetCatalog
            available={dashboard.availableWidgets}
            current={dashboard.editMode ? dashboard.activeWidgets : []}
            onAdd={(id, size, height) => {
              dashboard.addWidget(id, size, height)
              setCatalogOpen(false)
            }}
            onClose={() => setCatalogOpen(false)}
          />
        )}
      </div>
    </Layout>
  )
}
