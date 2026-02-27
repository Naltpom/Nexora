import { useState, useEffect, useCallback, useRef } from 'react'
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
            <div className="lifecycle-stats">
              <div className="lifecycle-stat">
                <span className="lifecycle-stat-value">{dashboard.total_active}</span>
                <span className="lifecycle-stat-label">{t('stat_active')}</span>
              </div>
              <div className="lifecycle-stat">
                <span className="lifecycle-stat-value">{dashboard.total_archived}</span>
                <span className="lifecycle-stat-label">{t('stat_archived')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="spinner" role="status" aria-label={t('loading')} />
      ) : dashboard ? (
        <>
          {/* Settings panel */}
          <div className="unified-card lifecycle-settings-card">
            <h3>{t('settings_title')}</h3>
            <div className="lifecycle-settings-grid">
              <div className="lifecycle-setting">
                <span className="lifecycle-setting-label">{t('inactivity_days_label')}</span>
                <span className="lifecycle-setting-value">{dashboard.inactivity_days}</span>
              </div>
              <div className="lifecycle-setting">
                <span className="lifecycle-setting-label">{t('archive_days_label')}</span>
                <span className="lifecycle-setting-value">{dashboard.archive_days}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="lifecycle-tabs">
            <button
              className={`lifecycle-tab ${activeTab === 'soon' ? 'active' : ''}`}
              onClick={() => setActiveTab('soon')}
            >
              {t('tab_soon_archive')}
              <span className="lifecycle-tab-count">{dashboard.soon_to_archive.length}</span>
            </button>
            <button
              className={`lifecycle-tab ${activeTab === 'archived' ? 'active' : ''}`}
              onClick={() => setActiveTab('archived')}
            >
              {t('tab_archived')}
              <span className="lifecycle-tab-count">{dashboard.archived_users.length}</span>
            </button>
          </div>

          {/* Table */}
          <div className="unified-card full-width-breakout card-table">
            {activeTab === 'soon' ? (
              dashboard.soon_to_archive.length === 0 ? (
                <div className="lifecycle-empty">{t('no_users_soon_archive')}</div>
              ) : (
                <div className="table-container">
                  <table className="unified-table">
                    <thead>
                      <tr>
                        <th>{t('col_user')}</th>
                        <th>{t('col_email')}</th>
                        <th>{t('col_last_active')}</th>
                        <th>{t('col_days_left')}</th>
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
                    <thead>
                      <tr>
                        <th>{t('col_user')}</th>
                        <th>{t('col_email')}</th>
                        <th>{t('col_archived_at')}</th>
                        <th>{t('col_days_left')}</th>
                        {canManage && <th>{t('col_actions')}</th>}
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
