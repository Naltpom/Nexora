import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNotifications } from './NotificationContext'
import { useFeature } from '../../core/FeatureContext'
import './notifications.css'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "A l'instant"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Il y a ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const { isActive } = useFeature()
  const pushActive = isActive('notification.push')
  const [open, setOpen] = useState(false)
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

  const handleBellClick = () => {
    if (pushActive) {
      setOpen(!open)
    } else {
      navigate('/notifications/settings')
    }
  }

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    if (!notif.is_read) markAsRead(notif.id)
    if (notif.link) {
      navigate(notif.link)
      setOpen(false)
    }
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    deleteNotification(id)
  }

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={handleBellClick}
        title={pushActive ? 'Notifications' : 'Parametres de notifications'}
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
            <span className="notification-dropdown-title">Notifications</span>
            <div className="notification-dropdown-actions">
              {unreadCount > 0 && (
                <button className="notification-mark-all-btn" onClick={markAllAsRead}>
                  Tout marquer lu
                </button>
              )}
            </div>
          </div>

          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-dropdown-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                Aucune notification
              </div>
            ) : (
              notifications.slice(0, 20).map(notif => (
                <div
                  key={notif.id}
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className={`notification-item-dot ${notif.is_read ? 'read' : ''}`} />
                  <div className="notification-item-content">
                    <div className="notification-item-title">{notif.title}</div>
                    {notif.body && (
                      <div className="notification-item-body">{notif.body}</div>
                    )}
                    <div className="notification-item-time">{timeAgo(notif.created_at)}</div>
                  </div>
                  <button
                    className="notification-item-delete"
                    onClick={(e) => handleDelete(e, notif.id)}
                    title="Supprimer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              Voir toutes
            </Link>
            <span style={{ margin: '0 8px', color: 'var(--gray-300)' }}>|</span>
            <Link to="/notifications/settings" onClick={() => setOpen(false)}>
              Parametres
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
