import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import { usePermission } from '../PermissionContext'
import './LifecyclePage.scss'

interface DashboardUser {
  id: number
  email: string
  first_name: string
  last_name: string
  last_active?: string | null
  archived_at?: string | null
  days_until_action: number
}

interface DashboardResponse {
  total_active: number
  total_archived: number
  inactivity_days: number
  archive_days: number
  soon_to_archive: DashboardUser[]
  archived_users: DashboardUser[]
}

function formatDate(iso: string | null | undefined, locale: string = 'fr'): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function LifecyclePage() {
  const { t, i18n } = useTranslation('lifecycle')
  const { can } = usePermission()
  const canManage = can('lifecycle.manage')

  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [activeTab, setActiveTab] = useState<'soon' | 'archived'>('soon')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [reactivating, setReactivating] = useState<number | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get<DashboardResponse>('/lifecycle/dashboard')
      setDashboard(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || t('error_load'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  const handleReactivate = async (userId: number) => {
    if (!confirm(t('reactivate_confirm'))) return
    setReactivating(userId)
    setError('')
    setSuccess('')
    try {
      await api.post(`/lifecycle/${userId}/reactivate`)
      setSuccess(t('reactivate_success'))
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      successTimerRef.current = setTimeout(() => setSuccess(''), 3000)
      await loadDashboard()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('error_reactivate'))
    } finally {
      setReactivating(null)
    }
  }

  const tabsRef = useRef<HTMLDivElement>(null)

  const handleTabKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (!tabsRef.current) return
    const tabs = Array.from(tabsRef.current.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    const currentIndex = tabs.indexOf(e.currentTarget)
    let nextIndex = -1

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    }

    if (nextIndex >= 0) {
      e.preventDefault()
      tabs[nextIndex].focus()
      setActiveTab(nextIndex === 0 ? 'soon' : 'archived')
    }
  }, [])

  return (
    <Layout
      breadcrumb={[
        { label: t('breadcrumb_accueil'), path: '/' },
        { label: t('breadcrumb_lifecycle') },
      ]}
      title={t('breadcrumb_lifecycle')}
    >
      {/* Page header */}
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('page_title')}</h1>
            <p>{t('page_subtitle')}</p>
          </div>
          {dashboard && (
            <div className="lifecycle-stats" aria-label={t('aria_stats')}>
              <div className="lifecycle-stat" aria-label={`${dashboard.total_active} ${t('stat_active')}`}>
                <span className="lifecycle-stat-value" aria-hidden="true">{dashboard.total_active}</span>
                <span className="lifecycle-stat-label">{t('stat_active')}</span>
              </div>
              <div className="lifecycle-stat" aria-label={`${dashboard.total_archived} ${t('stat_archived')}`}>
                <span className="lifecycle-stat-value" aria-hidden="true">{dashboard.total_archived}</span>
                <span className="lifecycle-stat-label">{t('stat_archived')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {success && <div className="alert alert-success" role="status">{success}</div>}

      {loading ? (
        <div className="spinner" role="status" aria-label={t('loading')} />
      ) : dashboard ? (
        <>
          {/* Settings panel */}
          <section className="unified-card lifecycle-settings-card" aria-labelledby="lifecycle-settings-heading">
            <h2 id="lifecycle-settings-heading">{t('settings_title')}</h2>
            <div className="lifecycle-settings-grid">
              <div className="lifecycle-setting">
                <span className="lifecycle-setting-label">{t('inactivity_days_label')}</span>
                <span className="lifecycle-setting-value" aria-label={`${dashboard.inactivity_days} ${t('inactivity_days_label')}`}>{dashboard.inactivity_days}</span>
              </div>
              <div className="lifecycle-setting">
                <span className="lifecycle-setting-label">{t('archive_days_label')}</span>
                <span className="lifecycle-setting-value" aria-label={`${dashboard.archive_days} ${t('archive_days_label')}`}>{dashboard.archive_days}</span>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className="lifecycle-tabs" role="tablist" aria-label={t('aria_tablist')} ref={tabsRef}>
            <button
              className={`lifecycle-tab ${activeTab === 'soon' ? 'active' : ''}`}
              onClick={() => setActiveTab('soon')}
              onKeyDown={handleTabKeyDown}
              type="button"
              role="tab"
              id="lifecycle-tab-soon"
              aria-selected={activeTab === 'soon'}
              aria-controls="lifecycle-tabpanel-soon"
              tabIndex={activeTab === 'soon' ? 0 : -1}
            >
              {t('tab_soon_archive')}
              <span className="lifecycle-tab-count" aria-label={`${dashboard.soon_to_archive.length} ${t('tab_soon_archive')}`}>{dashboard.soon_to_archive.length}</span>
            </button>
            <button
              className={`lifecycle-tab ${activeTab === 'archived' ? 'active' : ''}`}
              onClick={() => setActiveTab('archived')}
              onKeyDown={handleTabKeyDown}
              type="button"
              role="tab"
              id="lifecycle-tab-archived"
              aria-selected={activeTab === 'archived'}
              aria-controls="lifecycle-tabpanel-archived"
              tabIndex={activeTab === 'archived' ? 0 : -1}
            >
              {t('tab_archived')}
              <span className="lifecycle-tab-count" aria-label={`${dashboard.archived_users.length} ${t('tab_archived')}`}>{dashboard.archived_users.length}</span>
            </button>
          </div>

          {/* Table */}
          <div
            className="unified-card full-width-breakout card-table"
            role="tabpanel"
            id={`lifecycle-tabpanel-${activeTab}`}
            aria-labelledby={`lifecycle-tab-${activeTab}`}
            tabIndex={0}
          >
            {activeTab === 'soon' ? (
              dashboard.soon_to_archive.length === 0 ? (
                <div className="lifecycle-empty">{t('no_users_soon_archive')}</div>
              ) : (
                <div className="table-container">
                  <table className="unified-table">
                    <caption className="sr-only">{t('aria_table_soon')}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('col_user')}</th>
                        <th scope="col">{t('col_email')}</th>
                        <th scope="col">{t('col_last_active')}</th>
                        <th scope="col">{t('col_days_left')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.soon_to_archive.map((user) => (
                        <tr key={user.id}>
                          <td>{user.first_name} {user.last_name}</td>
                          <td className="text-gray-500-sm">{user.email}</td>
                          <td className="text-gray-500-sm nowrap">{formatDate(user.last_active, i18n.language)}</td>
                          <td>
                            <span className={`lifecycle-badge ${user.days_until_action <= 3 ? 'urgent' : user.days_until_action <= 14 ? 'warning' : ''}`}>
                              {user.days_until_action} {t('col_days_left').toLowerCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              dashboard.archived_users.length === 0 ? (
                <div className="lifecycle-empty">{t('no_users_archived')}</div>
              ) : (
                <div className="table-container">
                  <table className="unified-table">
                    <caption className="sr-only">{t('aria_table_archived')}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('col_user')}</th>
                        <th scope="col">{t('col_email')}</th>
                        <th scope="col">{t('col_archived_at')}</th>
                        <th scope="col">{t('col_days_left')}</th>
                        {canManage && <th scope="col">{t('col_actions')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.archived_users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.first_name} {user.last_name}</td>
                          <td className="text-gray-500-sm">{user.email}</td>
                          <td className="text-gray-500-sm nowrap">{formatDate(user.archived_at, i18n.language)}</td>
                          <td>
                            <span className={`lifecycle-badge ${user.days_until_action <= 3 ? 'urgent' : user.days_until_action <= 14 ? 'warning' : ''}`}>
                              {user.days_until_action} {t('col_days_left').toLowerCase()}
                            </span>
                          </td>
                          {canManage && (
                            <td>
                              <button
                                className="lifecycle-btn-reactivate"
                                onClick={() => handleReactivate(user.id)}
                                disabled={reactivating === user.id}
                                aria-label={t('aria_reactivate_user', { name: `${user.first_name} ${user.last_name}` })}
                              >
                                {reactivating === user.id ? t('reactivating') : t('btn_reactivate')}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </>
      ) : null}
    </Layout>
  )
}
