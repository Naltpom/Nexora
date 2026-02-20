import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import { useNotifications } from './NotificationContext'
import { useConfirm } from '../../core/ConfirmModal'
import api from '../../api'
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
  created_at: string
}

interface AdminNotificationItem extends NotificationItem {
  user_id: number
  user_email: string
  user_name: string
}

// -- Main Component --

export default function NotificationList() {
  const { user } = useAuth()
  const isSuperAdmin = user?.is_super_admin ?? false

  return (
    <Layout
      breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Notifications' }]}
      title="Notifications"
    >
      {isSuperAdmin ? <AdminNotificationList /> : <UserNotificationList />}
    </Layout>
  )
}

// -- User View --

function UserNotificationList() {
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

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setTotal(prev => prev - 1)
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }

  const handleClick = (notif: NotificationItem) => {
    if (!notif.is_read) handleMarkAsRead(notif.id)
    if (notif.link) navigate(notif.link)
  }

  const hasUnread = notifications.some(n => !n.is_read)

  return (
    <>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Mes notifications</h1>
            <p>Historique de vos notifications</p>
          </div>
          <div className="unified-page-header-actions">
            {hasUnread && (
              <button className="btn-unified-secondary" onClick={handleMarkAllAsRead}>
                Tout marquer comme lu
              </button>
            )}
            <Link to="/notifications/settings" className="btn-icon btn-icon-secondary" title="Parametres">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : notifications.length === 0 ? (
        <div className="unified-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Aucune notification
        </div>
      ) : (
        <>
          <div className="unified-card" style={{ padding: 0, overflow: 'hidden' }}>
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`notification-list-card${!notif.is_read ? ' unread' : ''}`}
                onClick={() => handleClick(notif)}
                style={{ cursor: notif.link ? 'pointer' : 'default' }}
              >
                <div className={`notification-item-dot${notif.is_read ? ' read' : ''}`} />
                <div className="notification-list-card-content">
                  <div className="notification-list-card-title">{notif.title}</div>
                  {notif.body && (
                    <div className="notification-list-card-body">{notif.body}</div>
                  )}
                  <div className="notification-list-card-meta">
                    <span className="notification-event-badge">{notif.event_type}</span>
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{timeAgo(notif.created_at)}</span>
                  </div>
                </div>
                <div className="notification-list-card-actions">
                  {!notif.is_read && (
                    <button
                      className="btn-icon btn-icon-secondary"
                      title="Marquer comme lu"
                      onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id) }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    className="btn-icon btn-icon-danger"
                    title="Supprimer"
                    onClick={(e) => { e.stopPropagation(); handleDelete(notif.id) }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            label="notification"
            onPageChange={goToPage}
            onPerPageChange={(pp) => { setPerPage(pp); setPage(1); loadData(1, pp) }}
          />
        </>
      )}
    </>
  )
}

// -- Admin View --

function AdminNotificationList() {
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
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { confirm, alert } = useConfirm()
  const { fetchNotifications: refreshBell } = useNotifications()

  const loadData = async (
    p?: number, s?: string, pp?: number, sb?: string, sd?: string, mine?: boolean
  ) => {
    const currentPage = p ?? page
    const currentSearch = s ?? search
    const currentPerPage = pp ?? perPage
    const currentSortBy = sb ?? sortBy
    const currentSortDir = sd ?? sortDir
    const currentMyOnly = mine ?? myOnly

    try {
      const res = await api.get('/notifications/admin', {
        params: {
          page: currentPage,
          per_page: currentPerPage,
          search: currentSearch,
          my_only: currentMyOnly,
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

  const handleToggleMyOnly = () => {
    const next = !myOnly
    setMyOnly(next)
    setPage(1)
    loadData(1, undefined, undefined, undefined, undefined, next)
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      refreshBell()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Supprimer la notification',
      message: 'Voulez-vous vraiment supprimer cette notification ?',
      confirmText: 'Supprimer',
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
  }

  const handleResendEmail = async (id: number) => {
    const ok = await confirm({
      title: "Renvoyer l'email",
      message: "Renvoyer l'email de notification a l'utilisateur ?",
      confirmText: 'Renvoyer',
      variant: 'warning',
    })
    if (!ok) return
    try {
      const res = await api.post(`/notifications/${id}/resend-email`)
      await alert({ title: 'Email renvoye', message: res.data.message })
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || "Erreur lors de l'envoi", variant: 'danger' })
    }
  }

  const handleResendWebhook = async (id: number) => {
    const ok = await confirm({
      title: 'Renvoyer le webhook',
      message: 'Renvoyer la notification via webhook ?',
      confirmText: 'Renvoyer',
      variant: 'warning',
    })
    if (!ok) return
    try {
      const res = await api.post(`/notifications/${id}/resend-webhook`)
      await alert({ title: 'Webhook renvoye', message: res.data.message })
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || "Erreur lors de l'envoi", variant: 'danger' })
    }
  }

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th className="th-sortable" onClick={() => handleSort(field)}>
      {children}
      {sortBy === field && (
        <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  )

  return (
    <>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Notifications</h1>
            <p>Gestion des notifications de tous les utilisateurs</p>
          </div>
          <div className="unified-page-header-actions">
            <label className="unified-filter-checkbox">
              <input
                type="checkbox"
                checked={!myOnly}
                onChange={handleToggleMyOnly}
              />
              Toutes les notifications
            </label>
            <div className="unified-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Link to="/notifications/settings" className="btn-icon btn-icon-secondary" title="Parametres">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="unified-card full-width-breakout card-table">
            <div className="table-container">
              <table className="unified-table">
                <thead>
                  <tr>
                    {!myOnly && <SortHeader field="user_email">Utilisateur</SortHeader>}
                    <th>Titre</th>
                    <SortHeader field="event_type">Type</SortHeader>
                    <SortHeader field="is_read">Lu</SortHeader>
                    <th>Email</th>
                    <th>Webhook</th>
                    <SortHeader field="created_at">Date</SortHeader>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.length === 0 ? (
                    <tr>
                      <td colSpan={myOnly ? 7 : 8} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                        Aucune notification
                      </td>
                    </tr>
                  ) : (
                    notifications.map(notif => (
                      <tr key={notif.id}>
                        {!myOnly && (
                          <td>
                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{notif.user_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{notif.user_email}</div>
                          </td>
                        )}
                        <td>
                          <div>
                            {notif.title}
                          </div>
                          {notif.body && (
                            <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
                              {notif.body}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="notification-event-badge">{notif.event_type}</span>
                        </td>
                        <td>
                          {notif.is_read ? (
                            <span style={{ color: 'var(--green-500, #22c55e)' }} title="Lu">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          ) : (
                            <span className="notification-item-dot" title="Non lu" />
                          )}
                        </td>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {notif.email_sent_at ? (
                            <span style={{ color: 'var(--green-500, #22c55e)' }} title={formatDate(notif.email_sent_at)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {' '}{formatDate(notif.email_sent_at)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--gray-400)' }}>{'\u2014'}</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {notif.webhook_sent_at ? (
                            <span style={{ color: 'var(--green-500, #22c55e)' }} title={formatDate(notif.webhook_sent_at)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {' '}{formatDate(notif.webhook_sent_at)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--gray-400)' }}>{'\u2014'}</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {formatDate(notif.created_at)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {!notif.is_read && (
                              <button
                                className="btn-icon btn-icon-secondary"
                                title="Marquer comme lu"
                                onClick={() => handleMarkAsRead(notif.id)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </button>
                            )}
                            <button
                              className="btn-icon btn-icon-danger"
                              title="Supprimer"
                              onClick={() => handleDelete(notif.id)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                            {notif.email_sent_at && (
                              <button
                                className="btn-resend btn-resend-email"
                                title={`Dernier envoi: ${formatDate(notif.email_sent_at)}`}
                                onClick={() => handleResendEmail(notif.id)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                                Email
                              </button>
                            )}
                            {notif.webhook_sent_at && (
                              <button
                                className="btn-resend btn-resend-webhook"
                                title={`Dernier envoi: ${formatDate(notif.webhook_sent_at)}`}
                                onClick={() => handleResendWebhook(notif.id)}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                                Webhook
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
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
            label="notification"
            onPageChange={goToPage}
            onPerPageChange={(pp) => { setPerPage(pp); setPage(1); loadData(1, undefined, pp) }}
          />
        </>
      )}
    </>
  )
}

// -- Shared Pagination --

function Pagination({
  page, totalPages, total, perPage, label, onPageChange, onPerPageChange,
}: {
  page: number
  totalPages: number
  total: number
  perPage: number
  label: string
  onPageChange: (p: number) => void
  onPerPageChange: (pp: number) => void
}) {
  return (
    <div className="unified-pagination">
      <span className="unified-pagination-info">{total} {label}{total > 1 ? 's' : ''}</span>
      <div className="unified-pagination-controls">
        <select
          className="per-page-select"
          value={perPage}
          onChange={(e) => onPerPageChange(parseInt(e.target.value))}
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
        {totalPages > 1 && (
          <>
            <button
              className="unified-pagination-btn"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc: (number | string)[], p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                  acc.push('...')
                }
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`dots-${i}`} className="unified-pagination-dots">...</span>
                ) : (
                  <button
                    key={p}
                    className={`unified-pagination-btn${p === page ? ' active' : ''}`}
                    onClick={() => onPageChange(p)}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              className="unified-pagination-btn"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
