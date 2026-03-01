import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useRealtimeEvent } from '../realtime/useRealtimeEvent'
import api from '../../api'
import './announcement.scss'

interface AnnouncementItem {
  id: number
  title: string
  body: string | null
  type: string
  is_dismissible: boolean
  priority: number
  start_date: string
  end_date: string | null
  created_at: string
}

export default function AnnouncementBanner() {
  const { t } = useTranslation('announcement')
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])

  const fetchActive = useCallback(() => {
    api.get('/announcements/active')
      .then(res => setAnnouncements(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchActive() }, [fetchActive])

  const handleSSE = useCallback((data: unknown) => {
    const evt = data as { display?: string }
    if (!evt.display || evt.display === 'banner') {
      fetchActive()
    }
  }, [fetchActive])

  useRealtimeEvent('announcement', handleSSE)

  const handleDismiss = useCallback(async (id: number) => {
    try {
      await api.post(`/announcements/${id}/dismiss`)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } catch {
      // ignore
    }
  }, [])

  if (announcements.length === 0) return null

  return (
    <div className="announcement-banners">
      {announcements.map(ann => (
        <div key={ann.id} className={`announcement-banner announcement-banner--${ann.type}`} role="alert">
          <div className="announcement-banner-icon">
            {ann.type === 'info' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            )}
            {ann.type === 'warning' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {ann.type === 'success' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            {ann.type === 'danger' && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <div className="announcement-banner-content">
            <div className="announcement-banner-title">{ann.title}</div>
            {ann.body && (
              ann.body.startsWith('<')
                ? <div className="announcement-banner-body-html" dangerouslySetInnerHTML={{ __html: ann.body }} />
                : <div className="announcement-banner-body">{ann.body}</div>
            )}
          </div>
          {ann.is_dismissible && (
            <button
              className="announcement-banner-dismiss"
              onClick={() => handleDismiss(ann.id)}
              title={t('banner_dismiss')}
              aria-label={t('banner_aria_dismiss')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
