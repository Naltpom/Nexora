import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../../api'

interface HealthData {
  db_status: string
  uptime_seconds: number
  active_users_24h: number
  total_users: number
  total_features: number
  active_features: number
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}j ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export default function SystemHealthWidget({ widgetId: _widgetId, size: _size }: { widgetId: string; size: string }) {
  const { t } = useTranslation('dashboard')
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/widgets/system-health')
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="dashboard-widget-loading">
        <div className="spinner spinner-sm" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted">{t('health_error')}</div>
  }

  return (
    <div className="dashboard-health">
      <h3 className="home-section-title">
        <svg className="home-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        {t('health_title')}
      </h3>
      <div className="dashboard-health-grid">
        <div className="dashboard-health-item">
          <div className={`dashboard-health-indicator dashboard-health-indicator--${data.db_status === 'healthy' ? 'ok' : 'error'}`} />
          <div>
            <div className="dashboard-health-label">{t('health_db')}</div>
            <div className="dashboard-health-value">
              {data.db_status === 'healthy' ? t('health_ok') : t('health_error')}
            </div>
          </div>
        </div>
        <div className="dashboard-health-item">
          <div className="dashboard-health-indicator dashboard-health-indicator--ok" />
          <div>
            <div className="dashboard-health-label">{t('health_uptime')}</div>
            <div className="dashboard-health-value">{formatUptime(data.uptime_seconds)}</div>
          </div>
        </div>
        <div className="dashboard-health-item">
          <div className="dashboard-health-indicator dashboard-health-indicator--ok" />
          <div>
            <div className="dashboard-health-label">{t('health_active_24h')}</div>
            <div className="dashboard-health-value">{data.active_users_24h}</div>
          </div>
        </div>
        <div className="dashboard-health-item">
          <div className="dashboard-health-indicator dashboard-health-indicator--ok" />
          <div>
            <div className="dashboard-health-label">{t('health_features')}</div>
            <div className="dashboard-health-value">{data.active_features}/{data.total_features}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
