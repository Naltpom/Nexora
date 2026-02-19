import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import api from '../../api'

interface Stats {
  active_users: number
  unread_notifications: number
  invitations_sent: number
}

export default function Home() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ active_users: 0, unread_notifications: 0, invitations_sent: 0 })
  const [loading, setLoading] = useState(true)

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
      const [notifRes] = await Promise.all([
        api.get('/notifications/', { params: { page: 1, per_page: 1 } }).catch(() => ({ data: { total: 0 } })),
      ])
      setStats(prev => ({
        ...prev,
        unread_notifications: notifRes.data.total || 0,
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
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            Bonjour {user?.first_name} !
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {today}
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div className="unified-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Utilisateurs actifs</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.active_users}</div>
          </div>
          <div className="unified-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Notifications non lues</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.unread_notifications}</div>
          </div>
          <div className="unified-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Invitations envoyees</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.invitations_sent}</div>
          </div>
        </div>

        {/* Quick start */}
        <div className="unified-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Acces rapide</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Link to="/profile" style={{ textDecoration: 'none' }}>
              <div className="unified-card" style={{ padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Mon profil</span>
                </div>
              </div>
            </Link>
            <Link to="/notifications" style={{ textDecoration: 'none' }}>
              <div className="unified-card" style={{ padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Mes notifications</span>
                </div>
              </div>
            </Link>
            <Link to="/notifications/settings" style={{ textDecoration: 'none' }}>
              <div className="unified-card" style={{ padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Parametres de notification</span>
                </div>
              </div>
            </Link>
            {user?.is_super_admin && (
              <Link to="/admin/users" style={{ textDecoration: 'none' }}>
                <div className="unified-card" style={{ padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Gestion des utilisateurs</span>
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
