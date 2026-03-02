import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useNotifications } from './NotificationContext'
import { useFeature } from '../../core/FeatureContext'
import { useMediaQuery } from '../../core/hooks/useMediaQuery'
import './notifications.scss'

interface NotifItem {
  id: number
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
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

// ── Memoized notification item ──

interface NotificationBellItemProps {
  notif: NotifItem
  onClick: (notif: NotifItem) => void
  onMarkAsUnread: (id: number) => void
  onDelete: (id: number) => void
  t: TFunction
}

const NotificationBellItem = memo(function NotificationBellItem({
  notif, onClick, onMarkAsUnread, onDelete, t
}: NotificationBellItemProps) {
  return (
    <div
      className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
      onClick={() => onClick(notif)}
    >
      <div className={`notification-item-dot ${notif.is_read ? 'read' : ''}`} />
      <div className="notification-item-content">
        <div className="notification-item-title">{notif.title}</div>
        {notif.body && (
          <div className="notification-item-body">{notif.body}</div>
        )}
        <div className="notification-item-time">{timeAgo(notif.created_at, t)}</div>
      </div>
      {notif.is_read && (
        <button
          className="notification-item-unread-btn"
          onClick={(e) => { e.stopPropagation(); onMarkAsUnread(notif.id) }}
          title={t('dropdown_mark_as_unread')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
          </svg>
        </button>
      )}
      <button
        className="notification-item-delete"
        onClick={(e) => { e.stopPropagation(); onDelete(notif.id) }}
        title={t('dropdown_delete')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
})

// ── Bell component ──

export default function NotificationBell() {
  const { t } = useTranslation('notification')
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications()
  const { isActive } = useFeature()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const pushActive = isActive('notification.push')
  const [open, setOpen] = useState(false)
  const [wiggle, setWiggle] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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

  const handleBellClick = () => {
    if (pushActive) {
      const opening = !open
      setOpen(opening)
      if (opening) fetchNotifications(1)
    } else {
      navigate('/notifications/settings')
    }
  }

  const handleNotificationClick = useCallback((notif: NotifItem) => {
    if (!notif.is_read) markAsRead(notif.id)
    if (notif.link) {
      navigate(notif.link)
    }
    setOpen(false)
  }, [markAsRead, navigate])

  const handleDelete = useCallback((id: number) => {
    deleteNotification(id)
  }, [deleteNotification])

  if (isMobile && unreadCount === 0) return null

  return (
    <div className={`notification-bell${wiggle ? ' notification-bell-wiggle' : ''}`} ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={handleBellClick}
        title={pushActive ? t('bell_title_notifications') : t('bell_title_settings')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {pushActive && unreadCount > 0 && (
          <span className="notification-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {pushActive && open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">{t('dropdown_title')}</span>
            <div className="notification-dropdown-actions">
              {unreadCount > 0 && (
                <button className="notification-mark-all-btn" onClick={markAllAsRead}>
                  {t('dropdown_mark_all_read')}
                </button>
              )}
            </div>
          </div>

          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-dropdown-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="notification-empty-icon">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {t('dropdown_empty')}
              </div>
            ) : (
              notifications.slice(0, 20).map(notif => (
                <NotificationBellItem
                  key={notif.id}
                  notif={notif}
                  onClick={handleNotificationClick}
                  onMarkAsUnread={markAsUnread}
                  onDelete={handleDelete}
                  t={t}
                />
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              {t('dropdown_view_all')}
            </Link>
            <span className="notification-footer-separator">|</span>
            <Link to="/notifications/settings" onClick={() => setOpen(false)}>
              {t('dropdown_settings')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
