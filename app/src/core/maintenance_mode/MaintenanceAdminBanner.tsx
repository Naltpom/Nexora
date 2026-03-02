import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMaintenanceStatus } from './useMaintenanceStatus'
import { useRealtimeEvent } from '../realtime/useRealtimeEvent'
import './maintenance_mode.scss'

export default function MaintenanceAdminBanner() {
  const { t } = useTranslation('maintenance_mode')
  const { is_active } = useMaintenanceStatus()

  const handleSSE = useCallback((data: unknown) => {
    const evt = data as { is_active?: boolean; message?: string; scheduled_end?: string }
    window.dispatchEvent(new CustomEvent('maintenance_mode_change', { detail: evt }))
  }, [])

  useRealtimeEvent('maintenance_mode', handleSSE)

  if (!is_active) return null

  return (
    <div className="maintenance-admin-banner" role="alert">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
      <span>{t('admin_banner')}</span>
      <Link to="/admin/maintenance" className="maintenance-admin-banner-link">
        {t('admin_banner_link')}
      </Link>
    </div>
  )
}
