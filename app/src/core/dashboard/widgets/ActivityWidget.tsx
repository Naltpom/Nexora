import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../../api'

interface EventItem {
  id: number
  event_type: string
  actor_email: string
  resource_type: string | null
  resource_id: number | null
  created_at: string
}

function getEventDotClass(eventType: string): string {
  const prefix = eventType.split('.')[0]
  const map: Record<string, string> = {
    auth: 'auth', user: 'user', role: 'role', sso: 'sso',
    feature: 'feature', notification: 'notification',
  }
  return map[prefix] || 'default'
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return t('time_just_now')
  if (diffMin < 60) return t('time_minutes_ago', { count: diffMin })
  if (diffHours < 24) return t('time_hours_ago', { count: diffHours })
  return t('time_days_ago', { count: diffDays })
}

export default function ActivityWidget({ widgetId: _widgetId, size: _size }: { widgetId: string; size: string }) {
  const { t } = useTranslation('dashboard')
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/widgets/activity')
      .then(res => setEvents(res.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="dashboard-widget-loading">
        <div className="spinner spinner-sm" />
      </div>
    )
  }

  return (
    <div className="dashboard-activity">
      <h3 className="home-section-title">
        <svg className="home-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {t('activity_title')}
      </h3>
      {events.length === 0 ? (
        <div className="home-timeline-empty">{t('activity_empty')}</div>
      ) : (
        <>
          <ol className="home-timeline-list" aria-label={t('activity_title')}>
            {events.map(evt => (
              <li key={evt.id} className="home-timeline-item">
                <div className="home-timeline-dot-col" aria-hidden="true">
                  <div className={`home-timeline-dot home-timeline-dot--${getEventDotClass(evt.event_type)}`} />
                </div>
                <div className="home-timeline-content">
                  <div className="home-timeline-label">
                    <span className="home-timeline-type">{evt.event_type}</span>
                  </div>
                  <div className="home-timeline-actor">{evt.actor_email}</div>
                </div>
                <time className="home-timeline-time" dateTime={evt.created_at}>
                  {formatRelativeTime(evt.created_at, t)}
                </time>
              </li>
            ))}
          </ol>
          <div className="home-timeline-footer">
            <Link to="/admin/events">{t('activity_view_all')}</Link>
          </div>
        </>
      )}
    </div>
  )
}
