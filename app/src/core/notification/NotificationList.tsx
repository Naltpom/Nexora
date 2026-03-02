import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import { usePermission } from '../PermissionContext'
import { useNotifications } from './NotificationContext'
import { useConfirm } from '../../core/ConfirmModal'
import { Pagination } from '../../core/pagination'
import api from '../../api'
import './notifications.scss'

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// -- Interfaces --

interface NotificationItem {
  id: number
  event_type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  email_sent_at: string | null
  webhook_sent_at: string | null
  push_sent_at: string | null
  created_at: string
}

interface AdminNotificationItem extends NotificationItem {
  user_id: number
  user_email: string
  user_name: string
  deleted_at: string | null
}

// -- Main Component --

export default function NotificationList() {
  const { t } = useTranslation('notification')
  const { can } = usePermission()

  return (
    <Layout
      breadcrumb={[{ label: t('breadcrumb_home'), path: '/' }, { label: t('breadcrumb_notifications') }]}
      title={t('page_title_notifications')}
    >
      {can('notification.admin') ? <AdminNotificationList /> : <UserNotificationList />}
    </Layout>
  )
}

// -- Memoized User Card --

interface UserNotificationCardProps {
  notif: NotificationItem
  onClick: (notif: NotificationItem) => void
  onKeyDown: (e: React.KeyboardEvent, notif: NotificationItem) => void
  onMarkAsRead: (id: number) => void
  onMarkAsUnread: (id: number) => void
  onDelete: (id: number) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

const UserNotificationCard = memo(function UserNotificationCard({
  notif, onClick, onKeyDown, onMarkAsRead, onMarkAsUnread, onDelete, t
}: UserNotificationCardProps) {
  return (
    <div
      className={`notification-list-card${!notif.is_read ? ' unread' : ''}${notif.link ? ' notif-clickable' : ''}`}
      onClick={() => onClick(notif)}
      onKeyDown={(e) => onKeyDown(e, notif)}
      role="listitem"
      tabIndex={notif.link ? 0 : undefined}
      aria-label={t('aria_notification_item', { title: notif.title, time: timeAgo(notif.created_at, t), status: notif.is_read ? t('admin_status_read') : t('admin_status_unread') })}
    >
      <div className={`notification-item-dot${notif.is_read ? ' read' : ''}`} aria-hidden="true" />
      <div className="notification-list-card-content">
        <div className="notification-list-card-title">{notif.title}</div>
        {notif.body && (
          <div className="notification-list-card-body">{notif.body}</div>
        )}
        <div className="notification-list-card-meta">
          <span className="notification-event-badge">{notif.event_type}</span>
          <span className="notif-time-ago">{timeAgo(notif.created_at, t)}</span>
        </div>
      </div>
      <div className="notification-list-card-actions">
        {!notif.is_read ? (
          <button
            className="btn-icon btn-icon-secondary"
            title={t('user_list_mark_as_read')}
            aria-label={t('user_list_mark_as_read')}
            aria-pressed={false}
            onClick={(e) => { e.stopPropagation(); onMarkAsRead(notif.id) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        ) : (
          <button
            className="btn-icon btn-icon-secondary"
            title={t('user_list_mark_as_unread')}
            aria-label={t('user_list_mark_as_unread')}
            aria-pressed={true}
            onClick={(e) => { e.stopPropagation(); onMarkAsUnread(notif.id) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
            </svg>
          </button>
        )}
        <button
          className="btn-icon btn-icon-danger"
          title={t('user_list_delete')}
          aria-label={t('aria_delete_notification', { title: notif.title })}
          onClick={(e) => { e.stopPropagation(); onDelete(notif.id) }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  )
})

// -- User View --

function UserNotificationList() {
  const { t } = useTranslation('notification')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(25)
  const navigate = useNavigate()
  const { fetchNotifications: refreshBell } = useNotifications()

  const loadData = async (p?: number, pp?: number) => {
    const currentPage = p ?? page
    const currentPerPage = pp ?? perPage
    try {
      const res = await api.get('/notifications/', {
        params: { page: currentPage, per_page: currentPerPage },
      })
      setNotifications(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.pages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const goToPage = (p: number) => {
    setPage(p)
    loadData(p)
  }

  const handleMarkAsRead = useCallback(async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }, [refreshBell])

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = useCallback(async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setTotal(prev => prev - 1)
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }, [refreshBell])

  const handleMarkAsUnread = useCallback(async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/unread`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }, [refreshBell])

  const handleClick = useCallback((notif: NotificationItem) => {
    if (!notif.is_read) handleMarkAsRead(notif.id)
    if (notif.link) navigate(notif.link)
  }, [handleMarkAsRead, navigate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, notif: NotificationItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(notif)
    }
  }, [handleClick])

  const hasUnread = notifications.some(n => !n.is_read)

  return (
    <>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('user_list_title')}</h1>
            <p>{t('user_list_subtitle')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{total}</span>
              <span className="page-header-stat-label">{t('stat_notifications')}</span>
            </div>
          </div>
          <div className="unified-page-header-actions">
            {hasUnread && (
              <button
                className="btn-unified-secondary"
                onClick={handleMarkAllAsRead}
                aria-label={t('user_list_mark_all_read')}
              >
                {t('user_list_mark_all_read')}
              </button>
            )}
            <Link to="/notifications/settings" className="btn-icon btn-icon-secondary" title={t('user_list_settings_title')} aria-label={t('user_list_settings_title')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-busy="true" role="status">
          <span className="sr-only">{t('aria_loading')}</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="unified-card notif-empty-state" role="status">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="notif-empty-icon" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {t('user_list_empty')}
        </div>
      ) : (
        <>
          <div className="unified-card notif-card-flush" aria-live="polite" role="list" aria-label={t('aria_notification_list')}>
            {notifications.map(notif => (
              <UserNotificationCard
                key={notif.id}
                notif={notif}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                onMarkAsRead={handleMarkAsRead}
                onMarkAsUnread={handleMarkAsUnread}
                onDelete={handleDelete}
                t={t}
              />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            itemLabel="notification"
            onPageChange={goToPage}
            onPerPageChange={(pp) => { setPerPage(pp); setPage(1); loadData(1, pp) }}
          />
        </>
      )}
    </>
  )
}

// -- Memoized Admin Row --

interface AdminNotificationRowProps {
  notif: AdminNotificationItem
  myOnly: boolean
  onMarkAsRead: (id: number) => void
  onMarkAsUnread: (id: number) => void
  onDelete: (id: number) => void
  onResendEmail: (id: number) => void
  onResendWebhook: (id: number) => void
  onResendPush: (id: number) => void
  canResendEmail: boolean
  canResendPush: boolean
  t: (key: string, opts?: Record<string, unknown>) => string
}

const AdminNotificationRow = memo(function AdminNotificationRow({
  notif, myOnly, onMarkAsRead, onMarkAsUnread, onDelete,
  onResendEmail, onResendWebhook, onResendPush,
  canResendEmail, canResendPush, t,
}: AdminNotificationRowProps) {
  return (
    <tr className={notif.deleted_at ? 'notif-row-deleted' : ''}>
      {!myOnly && (
        <td>
          <div className="notif-user-name">{notif.user_name}</div>
          <div className="notif-user-email">{notif.user_email}</div>
        </td>
      )}
      <td>
        <div>{notif.title}</div>
        {notif.body && <div className="notif-body-secondary">{notif.body}</div>}
      </td>
      <td><span className="notification-event-badge">{notif.event_type}</span></td>
      <td>
        {notif.is_read ? (
          <span className="notif-status-green" title={t('admin_status_read')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            <span className="sr-only">{t('admin_status_read')}</span>
          </span>
        ) : (
          <span className="notification-item-dot" title={t('admin_status_unread')}><span className="sr-only">{t('admin_status_unread')}</span></span>
        )}
      </td>
      <td className="notif-cell-nowrap">
        {notif.email_sent_at ? (
          <span className="notif-status-green" title={formatDate(notif.email_sent_at)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            {' '}{formatDate(notif.email_sent_at)}
          </span>
        ) : (
          <span className="notif-dash-muted" aria-label={t('aria_not_sent')}>{'\u2014'}</span>
        )}
      </td>
      <td className="notif-cell-nowrap">
        {notif.webhook_sent_at ? (
          <span className="notif-status-green" title={formatDate(notif.webhook_sent_at)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            {' '}{formatDate(notif.webhook_sent_at)}
          </span>
        ) : (
          <span className="notif-dash-muted" aria-label={t('aria_not_sent')}>{'\u2014'}</span>
        )}
      </td>
      <td className="notif-cell-nowrap">
        {notif.push_sent_at ? (
          <span className="notif-status-green" title={formatDate(notif.push_sent_at)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            {' '}{formatDate(notif.push_sent_at)}
          </span>
        ) : (
          <span className="notif-dash-muted" aria-label={t('aria_not_sent')}>{'\u2014'}</span>
        )}
      </td>
      <td className="notif-cell-nowrap">{formatDate(notif.created_at)}</td>
      <td>
        <div className="notif-actions-wrap">
          {!notif.is_read ? (
            <button className="btn-icon btn-icon-secondary" title={t('admin_mark_as_read')} aria-label={t('admin_mark_as_read')} aria-pressed={false} onClick={() => onMarkAsRead(notif.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            </button>
          ) : (
            <button className="btn-icon btn-icon-secondary" title={t('admin_mark_as_unread')} aria-label={t('admin_mark_as_unread')} aria-pressed={true} onClick={() => onMarkAsUnread(notif.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5" /></svg>
            </button>
          )}
          <button className="btn-icon btn-icon-danger" title={t('admin_delete')} aria-label={t('aria_delete_notification', { title: notif.title })} onClick={() => onDelete(notif.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
          {notif.email_sent_at && canResendEmail && (
            <button className="btn-resend btn-resend-email" title={t('admin_last_sent', { date: formatDate(notif.email_sent_at) })} aria-label={t('aria_resend_email', { title: notif.title })} onClick={() => onResendEmail(notif.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              {t('admin_resend_email_button')}
            </button>
          )}
          {notif.webhook_sent_at && (
            <button className="btn-resend btn-resend-webhook" title={t('admin_last_sent', { date: formatDate(notif.webhook_sent_at) })} aria-label={t('aria_resend_webhook', { title: notif.title })} onClick={() => onResendWebhook(notif.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
              {t('admin_resend_webhook_button')}
            </button>
          )}
          {notif.push_sent_at && canResendPush && (
            <button className="btn-resend btn-resend-push" title={t('admin_last_sent', { date: formatDate(notif.push_sent_at) })} aria-label={t('aria_resend_push', { title: notif.title })} onClick={() => onResendPush(notif.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              {t('admin_resend_push_button')}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
})

// -- Admin View --

function AdminNotificationList() {
  const { t } = useTranslation('notification')
  const { can } = usePermission()
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(25)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const [myOnly, setMyOnly] = useState(true)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { confirm, alert } = useConfirm()
  const { fetchNotifications: refreshBell } = useNotifications()

  const loadData = async (
    p?: number, s?: string, pp?: number, sb?: string, sd?: string, mine?: boolean, deleted?: boolean
  ) => {
    const currentPage = p ?? page
    const currentSearch = s ?? search
    const currentPerPage = pp ?? perPage
    const currentSortBy = sb ?? sortBy
    const currentSortDir = sd ?? sortDir
    const currentMyOnly = mine ?? myOnly
    const currentIncludeDeleted = deleted ?? includeDeleted

    try {
      const res = await api.get('/notifications/admin', {
        params: {
          page: currentPage,
          per_page: currentPerPage,
          search: currentSearch,
          my_only: currentMyOnly,
          include_deleted: currentIncludeDeleted,
          sort_by: currentSortBy,
          sort_dir: currentSortDir,
        },
      })
      setNotifications(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.pages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const goToPage = (p: number) => {
    setPage(p)
    loadData(p)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      loadData(1, value)
    }, 300)
  }

  const handleSort = (field: string) => {
    const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortDir(newDir)
    setPage(1)
    loadData(1, undefined, undefined, field, newDir)
  }

  const handleSortKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(field)
    }
  }

  const handleToggleMyOnly = () => {
    const next = !myOnly
    setMyOnly(next)
    setPage(1)
    loadData(1, undefined, undefined, undefined, undefined, next)
  }

  const handleToggleIncludeDeleted = () => {
    const next = !includeDeleted
    setIncludeDeleted(next)
    setPage(1)
    loadData(1, undefined, undefined, undefined, undefined, undefined, next)
  }

  const handleMarkAsRead = useCallback(async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }, [refreshBell])

  const handleMarkAsUnread = useCallback(async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/unread`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }, [refreshBell])

  const handleDelete = useCallback(async (id: number) => {
    const ok = await confirm({
      title: t('confirm_delete_title'),
      message: t('confirm_delete_message'),
      confirmText: t('confirm_delete_button'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setTotal(prev => prev - 1)
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }, [confirm, t, refreshBell])

  const handleResendEmail = useCallback(async (id: number) => {
    const ok = await confirm({
      title: t('confirm_resend_email_title'),
      message: t('confirm_resend_email_message'),
      confirmText: t('confirm_resend_email_button'),
      variant: 'warning',
    })
    if (!ok) return
    try {
      const res = await api.post(`/notifications/${id}/resend-email`)
      await alert({ title: t('alert_email_sent_title'), message: res.data.message })
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || t('alert_send_error'), variant: 'danger' })
    }
  }, [confirm, alert, t])

  const handleResendPush = useCallback(async (id: number) => {
    const ok = await confirm({
      title: t('confirm_resend_push_title'),
      message: t('confirm_resend_push_message'),
      confirmText: t('confirm_resend_push_button'),
      variant: 'warning',
    })
    if (!ok) return
    try {
      const res = await api.post(`/notifications/${id}/resend-push`)
      await alert({ title: t('alert_push_sent_title'), message: res.data.message })
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || t('alert_send_error'), variant: 'danger' })
    }
  }, [confirm, alert, t])

  const handleResendWebhook = useCallback(async (id: number) => {
    const ok = await confirm({
      title: t('confirm_resend_webhook_title'),
      message: t('confirm_resend_webhook_message'),
      confirmText: t('confirm_resend_webhook_button'),
      variant: 'warning',
    })
    if (!ok) return
    try {
      const res = await api.post(`/notifications/${id}/resend-webhook`)
      await alert({ title: t('alert_webhook_sent_title'), message: res.data.message })
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || t('alert_send_error'), variant: 'danger' })
    }
  }, [confirm, alert, t])

  const canResendEmail = can('notification.email.resend')
  const canResendPush = can('notification.push.resend')

  const getAriaSort = (field: string): 'ascending' | 'descending' | 'none' => {
    if (sortBy !== field) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      className="th-sortable"
      onClick={() => handleSort(field)}
      onKeyDown={(e) => handleSortKeyDown(e, field)}
      role="columnheader"
      tabIndex={0}
      aria-sort={getAriaSort(field)}
      scope="col"
    >
      {children}
      {sortBy === field && (
        <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  )

  return (
    <>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('admin_list_title')}</h1>
            <p>{t('admin_list_subtitle')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{total}</span>
              <span className="page-header-stat-label">{t('stat_notifications')}</span>
            </div>
          </div>
          <div className="unified-page-header-actions">
            <label className="unified-filter-checkbox">
              <input
                type="checkbox"
                checked={!myOnly}
                onChange={handleToggleMyOnly}
                aria-label={t('admin_filter_all_notifications')}
              />
              {t('admin_filter_all_notifications')}
            </label>
            <label className="unified-filter-checkbox notif-filter-deleted">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={handleToggleIncludeDeleted}
                aria-label={t('admin_filter_show_deleted')}
              />
              {t('admin_filter_show_deleted')}
            </label>
            <div className="unified-search-box" role="search" aria-label={t('aria_search_notifications')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t('admin_search_placeholder')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label={t('aria_search_notifications')}
              />
            </div>
            <Link to="/notifications/settings" className="btn-icon btn-icon-secondary" title={t('admin_settings_title')} aria-label={t('admin_settings_title')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-busy="true" role="status">
          <span className="sr-only">{t('aria_loading')}</span>
        </div>
      ) : (
        <>
          <div className="unified-card full-width-breakout card-table">
            <div className="table-container">
              <table className="unified-table" aria-label={t('aria_admin_table_caption')}>
                <caption className="sr-only">{t('aria_admin_table_caption')}</caption>
                <thead>
                  <tr>
                    {!myOnly && <SortHeader field="user_email">{t('admin_column_user')}</SortHeader>}
                    <th scope="col">{t('admin_column_title')}</th>
                    <SortHeader field="event_type">{t('admin_column_type')}</SortHeader>
                    <SortHeader field="is_read">{t('admin_column_read')}</SortHeader>
                    <th scope="col">{t('admin_column_email')}</th>
                    <th scope="col">{t('admin_column_webhook')}</th>
                    <th scope="col">{t('admin_column_push')}</th>
                    <SortHeader field="created_at">{t('admin_column_date')}</SortHeader>
                    <th scope="col">{t('admin_column_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.length === 0 ? (
                    <tr>
                      <td colSpan={myOnly ? 8 : 9} className="notif-admin-empty-cell">
                        {t('admin_empty')}
                      </td>
                    </tr>
                  ) : (
                    notifications.map(notif => (
                      <AdminNotificationRow
                        key={notif.id}
                        notif={notif}
                        myOnly={myOnly}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAsUnread={handleMarkAsUnread}
                        onDelete={handleDelete}
                        onResendEmail={handleResendEmail}
                        onResendWebhook={handleResendWebhook}
                        onResendPush={handleResendPush}
                        canResendEmail={canResendEmail}
                        canResendPush={canResendPush}
                        t={t}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            itemLabel="notification"
            onPageChange={goToPage}
            onPerPageChange={(pp) => { setPerPage(pp); setPage(1); loadData(1, undefined, pp) }}
          />
        </>
      )}
    </>
  )
}
