import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../Layout'
import api from '../../api'
import './maintenance_mode.scss'

interface MaintenanceWindowData {
  id: number
  is_active: boolean
  message: string | null
  scheduled_start: string
  scheduled_end: string | null
  bypass_roles: string[]
  created_by_name: string | null
  created_at: string
}

export default function MaintenanceAdmin() {
  const { t } = useTranslation('maintenance_mode')
  const [windows, setWindows] = useState<MaintenanceWindowData[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showFeedback = useCallback((type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 3000)
  }, [])

  // Activation form state
  const [message, setMessage] = useState('')
  const [bypassRoles, setBypassRoles] = useState('super_admin,admin')

  // Schedule form state
  const [schedStart, setSchedStart] = useState('')
  const [schedEnd, setSchedEnd] = useState('')
  const [schedMessage, setSchedMessage] = useState('')

  const isActive = windows.some(w => w.is_active)

  const fetchWindows = useCallback(async () => {
    try {
      const res = await api.get('/maintenance/windows')
      setWindows(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWindows() }, [fetchWindows])

  const handleActivate = useCallback(async () => {
    if (!confirm(t('activate_confirm'))) return
    setActing(true)
    try {
      const roles = bypassRoles.split(',').map(r => r.trim()).filter(Boolean)
      await api.post('/maintenance/activate', {
        message: message || null,
        bypass_roles: roles,
      })
      showFeedback('success', t('toast_activated'))
      fetchWindows()
    } catch {
      showFeedback('error', t('toast_error'))
    } finally {
      setActing(false)
    }
  }, [message, bypassRoles, t, fetchWindows, showFeedback])

  const handleDeactivate = useCallback(async () => {
    if (!confirm(t('deactivate_confirm'))) return
    setActing(true)
    try {
      await api.post('/maintenance/deactivate')
      showFeedback('success', t('toast_deactivated'))
      fetchWindows()
    } catch {
      showFeedback('error', t('toast_error'))
    } finally {
      setActing(false)
    }
  }, [t, fetchWindows, showFeedback])

  const handleSchedule = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedStart) return
    setActing(true)
    try {
      const roles = bypassRoles.split(',').map(r => r.trim()).filter(Boolean)
      await api.post('/maintenance/schedule', {
        message: schedMessage || null,
        scheduled_start: new Date(schedStart).toISOString(),
        scheduled_end: schedEnd ? new Date(schedEnd).toISOString() : null,
        bypass_roles: roles,
      })
      showFeedback('success', t('toast_scheduled'))
      setSchedStart('')
      setSchedEnd('')
      setSchedMessage('')
      fetchWindows()
    } catch {
      showFeedback('error', t('toast_error'))
    } finally {
      setActing(false)
    }
  }, [schedStart, schedEnd, schedMessage, bypassRoles, t, fetchWindows, showFeedback])

  const handleDeleteWindow = useCallback(async (id: number) => {
    if (!confirm(t('window_delete_confirm'))) return
    try {
      await api.delete(`/maintenance/windows/${id}`)
      showFeedback('success', t('toast_deleted'))
      fetchWindows()
    } catch {
      showFeedback('error', t('toast_error'))
    }
  }, [t, fetchWindows, showFeedback])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString()
  }

  return (
    <Layout title={t('admin_title')} breadcrumb={[{ label: t('admin_title') }]}>
      <div className="maintenance-admin">
        {feedback && (
          <div className={`alert alert-${feedback.type === 'success' ? 'success' : 'danger'}`}>
            {feedback.msg}
          </div>
        )}

        {/* Header */}
        <div className="maintenance-admin-header">
          <h1 className="maintenance-admin-title">{t('admin_title')}</h1>
          <span className={`maintenance-status-badge ${isActive ? 'active' : 'inactive'}`}>
            <span className="maintenance-status-dot" />
            {isActive ? t('status_active') : t('status_inactive')}
          </span>
        </div>

        {/* Toggle section */}
        <div className="maintenance-toggle-section">
          <div className="maintenance-form-group">
            <label className="maintenance-form-label">{t('message_label')}</label>
            <textarea
              className="maintenance-textarea"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('message_placeholder')}
            />
          </div>

          <div className="maintenance-form-group">
            <label className="maintenance-form-label">{t('bypass_roles_label')}</label>
            <input
              className="maintenance-input"
              type="text"
              value={bypassRoles}
              onChange={e => setBypassRoles(e.target.value)}
            />
            <span className="maintenance-form-help">{t('bypass_roles_help')}</span>
          </div>

          <div className="maintenance-toggle-actions">
            {!isActive ? (
              <button
                className="maintenance-btn maintenance-btn-danger"
                onClick={handleActivate}
                disabled={acting}
              >
                {t('activate')}
              </button>
            ) : (
              <button
                className="maintenance-btn maintenance-btn-success"
                onClick={handleDeactivate}
                disabled={acting}
              >
                {t('deactivate')}
              </button>
            )}
          </div>
        </div>

        {/* Schedule form */}
        <form className="maintenance-schedule-form" onSubmit={handleSchedule}>
          <h2 className="maintenance-section-title">{t('schedule_title')}</h2>

          <div className="maintenance-form-group">
            <label className="maintenance-form-label">{t('message_label')}</label>
            <textarea
              className="maintenance-textarea"
              value={schedMessage}
              onChange={e => setSchedMessage(e.target.value)}
              placeholder={t('message_placeholder')}
            />
          </div>

          <div className="maintenance-schedule-fields">
            <div className="maintenance-form-group">
              <label className="maintenance-form-label">{t('schedule_start')}</label>
              <input
                className="maintenance-input"
                type="datetime-local"
                value={schedStart}
                onChange={e => setSchedStart(e.target.value)}
                required
              />
            </div>

            <div className="maintenance-form-group">
              <label className="maintenance-form-label">{t('schedule_end')}</label>
              <input
                className="maintenance-input"
                type="datetime-local"
                value={schedEnd}
                onChange={e => setSchedEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="maintenance-toggle-actions">
            <button
              type="submit"
              className="maintenance-btn maintenance-btn-primary"
              disabled={acting || !schedStart}
            >
              {t('schedule_submit')}
            </button>
          </div>
        </form>

        {/* Windows table */}
        <div className="maintenance-windows-section">
          <h2 className="maintenance-section-title">{t('windows_title')}</h2>

          {loading ? (
            <div className="maintenance-windows-empty">...</div>
          ) : windows.length === 0 ? (
            <div className="maintenance-windows-empty">{t('windows_empty')}</div>
          ) : (
            <table className="maintenance-windows-table">
              <thead>
                <tr>
                  <th>{t('status_active')}</th>
                  <th>{t('schedule_start')}</th>
                  <th>{t('schedule_end')}</th>
                  <th>{t('message_label')}</th>
                  <th>{t('window_created_by')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {windows.map(w => (
                  <tr key={w.id}>
                    <td>
                      <span className={`maintenance-status-badge ${w.is_active ? 'active' : 'inactive'}`}>
                        <span className="maintenance-status-dot" />
                        {w.is_active ? t('status_active') : w.scheduled_start && new Date(w.scheduled_start) > new Date() ? t('status_scheduled') : t('status_inactive')}
                      </span>
                    </td>
                    <td>{formatDate(w.scheduled_start)}</td>
                    <td>{w.scheduled_end ? formatDate(w.scheduled_end) : '-'}</td>
                    <td>{w.message || '-'}</td>
                    <td>{w.created_by_name || '-'}</td>
                    <td>
                      <button
                        className="maintenance-btn maintenance-btn-ghost"
                        onClick={() => handleDeleteWindow(w.id)}
                      >
                        {t('window_delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  )
}
