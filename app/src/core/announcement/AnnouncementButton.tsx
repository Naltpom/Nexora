import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useRealtimeEvent } from '../realtime/useRealtimeEvent'
import { useMediaQuery } from '../hooks/useMediaQuery'
import api from '../../api'
import AnnouncementModal from './AnnouncementModal'
import './announcement.scss'

interface ModalAnnouncement {
  id: number
  title: string
  body: string | null
  type: string
  requires_acknowledgment: boolean
  priority: number
  start_date: string
  end_date: string | null
  created_at: string
  is_read: boolean
}

function timeAgo(dateStr: string, t: TFunction): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return t('time_ago_just_now')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('time_ago_minutes', { minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time_ago_hours', { hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('time_ago_days', { days })
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// ── Memoized dropdown item ──

interface DropdownItemProps {
  ann: ModalAnnouncement
  onClick: (ann: ModalAnnouncement) => void
  t: TFunction
}

const AnnouncementDropdownItem = memo(function AnnouncementDropdownItem({
  ann, onClick, t
}: DropdownItemProps) {
  return (
    <div
      className={`announcement-dropdown-item${!ann.is_read ? ' unread' : ''}`}
      onClick={() => onClick(ann)}
    >
      <div className={`announcement-dropdown-item-dot${ann.is_read ? ' read' : ''}`} />
      <div className="announcement-dropdown-item-content">
        <div className="announcement-dropdown-item-header">
          <span className="announcement-dropdown-item-title">{ann.title}</span>
          <span className={`announcement-type-badge ${ann.type}`}>
            {t(`type_${ann.type}`)}
          </span>
        </div>
        <div className="announcement-dropdown-item-time">{timeAgo(ann.created_at, t)}</div>
      </div>
    </div>
  )
})

// ── Megaphone button component ──

export default function AnnouncementButton() {
  const { t } = useTranslation('announcement')
  const [open, setOpen] = useState(false)
  const [announcements, setAnnouncements] = useState<ModalAnnouncement[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [wiggle, setWiggle] = useState(false)
  const [selectedAnn, setSelectedAnn] = useState<ModalAnnouncement | null>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/announcements/modal/unread-count')
      setUnreadCount(res.data.count)
    } catch {
      // ignore
    }
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get('/announcements/modal/', { params: { per_page: 20 } })
      setAnnouncements(res.data.items)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    const onDismiss = () => fetchUnreadCount()
    window.addEventListener('announcement-dismissed', onDismiss)
    return () => window.removeEventListener('announcement-dismissed', onDismiss)
  }, [fetchUnreadCount])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (unreadCount > 0) {
      setWiggle(true)
      const timer = setTimeout(() => setWiggle(false), 700)
      return () => clearTimeout(timer)
    }
  }, [unreadCount])

  const handleSSE = useCallback(() => {
    fetchUnreadCount()
    if (open) fetchAnnouncements()
  }, [fetchUnreadCount, fetchAnnouncements, open])

  useRealtimeEvent('announcement', handleSSE)

  const handleToggle = () => {
    const opening = !open
    setOpen(opening)
    if (opening) {
      fetchAnnouncements()
      fetchUnreadCount()
    }
  }

  const handleItemClick = useCallback((ann: ModalAnnouncement) => {
    setSelectedAnn(ann)
    setOpen(false)
  }, [])

  const handleModalDismissed = useCallback((id: number) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    setUnreadCount(prev => Math.max(0, prev - 1))
    setSelectedAnn(null)
  }, [])

  const handleModalClose = useCallback(() => {
    setSelectedAnn(null)
  }, [])

  if (isMobile && unreadCount === 0) return null

  return (
    <>
      <div className={`announcement-bell${wiggle ? ' announcement-bell-wiggle' : ''}`} ref={dropdownRef}>
        <button
          className="announcement-bell-btn"
          onClick={handleToggle}
          title={t('megaphone_title')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M12 2v2" />
            <path d="M4.9 4.9L3.5 3.5" />
            <path d="M19.1 4.9l1.4-1.4" />
          </svg>
          {unreadCount > 0 && (
            <span className="announcement-bell-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="announcement-dropdown">
            <div className="announcement-dropdown-header">
              <span className="announcement-dropdown-title">{t('megaphone_dropdown_title')}</span>
            </div>

            <div className="announcement-dropdown-list">
              {announcements.length === 0 ? (
                <div className="announcement-dropdown-empty">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="announcement-empty-icon">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M12 2v2" />
                  </svg>
                  {t('megaphone_dropdown_empty')}
                </div>
              ) : (
                announcements.map(ann => (
                  <AnnouncementDropdownItem
                    key={ann.id}
                    ann={ann}
                    onClick={handleItemClick}
                    t={t}
                  />
                ))
              )}
            </div>

            <div className="announcement-dropdown-footer">
              <Link to="/announcements" onClick={() => setOpen(false)}>
                {t('megaphone_view_all')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {selectedAnn && (
        <AnnouncementModal
          announcement={selectedAnn}
          blocking={selectedAnn.requires_acknowledgment && !selectedAnn.is_read}
          onDismissed={handleModalDismissed}
          onClose={handleModalClose}
        />
      )}
    </>
  )
}
