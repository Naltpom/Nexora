import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import { useScrollReveal, useCountUp } from '../../core/hooks'
import api from '../../api'
import './_identity.scss'

interface Stats {
  active_users: number
  unread_notifications: number
  invitations_sent: number
}

export default function Home() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ active_users: 0, unread_notifications: 0, invitations_sent: 0 })
  const [loading, setLoading] = useState(true)

  const statGridRef = useScrollReveal<HTMLDivElement>({ stagger: true })
  const quickGridRef = useScrollReveal<HTMLDivElement>({ stagger: true })
  const usersCount = useCountUp(stats.active_users, { delay: 200 })
  const notifsCount = useCountUp(stats.unread_notifications, { delay: 350 })
  const invitesCount = useCountUp(stats.invitations_sent, { delay: 500 })

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const [usersRes, unreadRes] = await Promise.all([
        api.get('/users/', { params: { page: 1, per_page: 1 } }).catch(() => ({ data: { total: 0 } })),
        api.get('/notifications/unread-count').catch(() => ({ data: { count: 0 } })),
      ])
      setStats(prev => ({
        ...prev,
        active_users: usersRes.data.total || 0,
        unread_notifications: unreadRes.data.count || 0,
      }))
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading-screen"><div className="spinner" /></div>
      </Layout>
    )
  }

  return (
    <Layout title="Accueil">
      <div className="page-wide">
        {/* Welcome */}
        <div className="section-mb-xl">
          <h1 className="title-lg">
            Bonjour {user?.first_name} !
          </h1>
          <p className="text-gray-500">
            {today}
          </p>
        </div>

        {/* Stat cards */}
        <div className="stat-grid section-mb-xl reveal-stagger" ref={statGridRef}>
          <Link to="/admin/users" className="stat-card stat-card--users stat-glow card-hover-lift reveal-child">
            <div className="stat-card-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="stat-card-info">
              <div className="stat-card-value" ref={usersCount.ref}>{usersCount.value}</div>
              <div className="stat-card-label">Utilisateurs actifs</div>
            </div>
          </Link>
          <Link to="/notifications" className="stat-card stat-card--notifs stat-glow card-hover-lift reveal-child">
            <div className="stat-card-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="stat-card-info">
              <div className="stat-card-value" ref={notifsCount.ref}>{notifsCount.value}</div>
              <div className="stat-card-label">Notifications non lues</div>
            </div>
            {stats.unread_notifications > 0 && <div className="stat-card-pulse" />}
          </Link>
          <div className="stat-card stat-card--invites stat-glow card-hover-lift reveal-child">
            <div className="stat-card-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="stat-card-info">
              <div className="stat-card-value" ref={invitesCount.ref}>{invitesCount.value}</div>
              <div className="stat-card-label">Invitations envoyees</div>
            </div>
          </div>
        </div>

        {/* Quick start */}
        <div className="unified-card card-padded">
          <h2 className="title-sm">Acces rapide</h2>
          <div className="auto-grid-sm reveal-stagger" ref={quickGridRef}>
            <Link to="/profile" className="card-link-item reveal-child card-hover-lift">
              <div className="unified-card">
                <div className="card-link-item-content">
                  <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="card-link-item-label">Mon profil</span>
                </div>
              </div>
            </Link>
            <Link to="/notifications" className="card-link-item reveal-child card-hover-lift">
              <div className="unified-card">
                <div className="card-link-item-content">
                  <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span className="card-link-item-label">Mes notifications</span>
                </div>
              </div>
            </Link>
            <Link to="/notifications/settings" className="card-link-item reveal-child card-hover-lift">
              <div className="unified-card">
                <div className="card-link-item-content">
                  <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span className="card-link-item-label">Parametres de notification</span>
                </div>
              </div>
            </Link>
            {user?.is_super_admin && (
              <Link to="/admin/users" className="card-link-item reveal-child card-hover-lift">
                <div className="unified-card">
                  <div className="card-link-item-content">
                    <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span className="card-link-item-label">Gestion des utilisateurs</span>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
