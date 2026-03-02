import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../Layout'
import api from '../../api'
import WidgetCatalog from './WidgetCatalog'
import type { WidgetConfig, WidgetDefinition } from './useDashboard'
import './dashboard.scss'

interface RoleOption {
  slug: string
  name: string
}

export default function DashboardAdmin() {
  const { t } = useTranslation('dashboard')
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [selectedRole, setSelectedRole] = useState<string>('__global__')
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [availableWidgets, setAvailableWidgets] = useState<WidgetDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showCatalog, setShowCatalog] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/roles/'),
      api.get('/dashboard/widgets'),
    ]).then(([rolesRes, widgetsRes]) => {
      const items = rolesRes.data.items || rolesRes.data || []
      setRoles(items.map((r: any) => ({ slug: r.slug, name: r.name })))
      setAvailableWidgets(widgetsRes.data || [])
    }).catch(() => {})
  }, [])

  const loadDefault = useCallback(async (roleSlug: string) => {
    setLoading(true)
    setMessage(null)
    try {
      const res = await api.get(`/dashboard/defaults/${roleSlug}`)
      setWidgets(res.data.widgets || [])
    } catch {
      setWidgets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDefault(selectedRole)
  }, [selectedRole, loadDefault])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await api.put(`/dashboard/defaults/${selectedRole}`, { widgets })
      setMessage(t('admin_saved'))
    } catch {
      setMessage(t('admin_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await api.delete(`/dashboard/defaults/${selectedRole}`)
      setWidgets([])
      setMessage(t('admin_deleted'))
    } catch {
      setMessage(t('admin_not_found'))
    } finally {
      setSaving(false)
    }
  }

  const handleAddWidget = (widgetId: string, size: 'half' | 'full') => {
    setWidgets(prev => [
      ...prev,
      { widget_id: widgetId, position: prev.length, size },
    ])
    setShowCatalog(false)
  }

  const handleRemoveWidget = (index: number) => {
    setWidgets(prev => prev.filter((_, i) => i !== index).map((w, i) => ({ ...w, position: i })))
  }

  const handleResizeWidget = (index: number) => {
    setWidgets(prev => prev.map((w, i) =>
      i === index ? { ...w, size: w.size === 'half' ? 'full' : 'half' } : w
    ))
  }

  return (
    <Layout title={t('admin_title')}>
      <div className="page-narrow">
        <div className="unified-page-header">
          <h1 className="title-lg">{t('admin_title')}</h1>
          <p className="text-secondary">{t('admin_subtitle')}</p>
        </div>

        <div className="unified-card card-padded">
          <div className="flex-between mb-16">
            <label className="field-label" htmlFor="role-select">{t('admin_select_role')}</label>
            <select
              id="role-select"
              className="input-select"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
            >
              <option value="__global__">{t('admin_global_default')}</option>
              {roles.map(r => (
                <option key={r.slug} value={r.slug}>{r.name}</option>
              ))}
            </select>
          </div>

          {message && (
            <div className="alert-dynamic alert-dynamic--info mb-16">{message}</div>
          )}

          {loading ? (
            <div className="empty-state-sm">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {widgets.length === 0 ? (
                <div className="empty-state-sm">{t('admin_no_layout')}</div>
              ) : (
                <div className="dashboard-admin-list">
                  {widgets.map((w, idx) => (
                    <div key={`${w.widget_id}-${idx}`} className="dashboard-admin-item">
                      <div className="dashboard-admin-item-info">
                        <span className="font-medium">{w.widget_id}</span>
                        <span className="text-muted">{w.size}</span>
                      </div>
                      <div className="dashboard-admin-item-actions">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleResizeWidget(idx)}
                          title={w.size === 'half' ? t('expand') : t('shrink')}
                        >
                          {w.size === 'half' ? '↔' : '↕'}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleRemoveWidget(idx)}
                        >
                          {t('common:delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex-row mt-16">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCatalog(true)}
                >
                  {t('add_widget')}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {t('common:save')}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {t('admin_delete_layout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showCatalog && (
        <WidgetCatalog
          available={availableWidgets}
          current={widgets}
          onAdd={handleAddWidget}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </Layout>
  )
}
