import { useState, useEffect, ReactNode, useMemo } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import { usePermission } from '../PermissionContext'
import { useFeature } from '../FeatureContext'
import { useScrollReveal, useCountUp } from '../../core/hooks'
import type { FeatureManifest } from '../../types'
import api from '../../api'
import './_identity.scss'

// ── Stat card config ──

interface StatCardConfig {
  id: string
  labelKey: string
  permission?: string
  featureGate?: string
  variant: string
  icon: ReactNode
  link: string
  pulse?: (value: number) => boolean
  fetchStat: () => Promise<number>
}

const STAT_CARDS: StatCardConfig[] = [
  {
    id: 'users',
    labelKey: 'home.stat_active_users',
    permission: 'users.read',
    variant: 'users',
    link: '/admin/users',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    fetchStat: async () => {
      const res = await api.get('/users/', { params: { page: 1, per_page: 1 } })
      return res.data.total || 0
    },
  },
  {
    id: 'notifs',
    labelKey: 'home.stat_unread_notifications',
    featureGate: 'notification',
    variant: 'notifs',
    link: '/notifications',
    pulse: (v) => v > 0,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    fetchStat: async () => {
      const res = await api.get('/notifications/unread-count')
      return res.data.count || 0
    },
  },
  {
    id: 'invites',
    labelKey: 'home.stat_invitations_pending',
    permission: 'invitations.read',
    variant: 'invites',
    link: '/admin/users?tab=invitations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    fetchStat: async () => {
      const res = await api.get('/invitations')
      return Array.isArray(res.data) ? res.data.length : 0
    },
  },
  {
    id: 'events',
    labelKey: 'home.stat_recent_events',
    permission: 'event.read',
    featureGate: 'event',
    variant: 'events',
    link: '/admin/events',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    fetchStat: async () => {
      const res = await api.get('/events/', { params: { page: 1, per_page: 1 } })
      return res.data.total || 0
    },
  },
]

// ── Quick access link config ──

interface QuickLinkConfig {
  path: string
  labelKey: string
  permission?: string
  featureGate?: string
  icon: ReactNode
}

const USER_LINKS: QuickLinkConfig[] = [
  {
    path: '/profile',
    labelKey: 'home.link_profile',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    path: '/notifications',
    labelKey: 'home.link_notifications',
    featureGate: 'notification',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    path: '/notifications/settings',
    labelKey: 'home.link_notification_settings',
    featureGate: 'notification',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    path: '/preferences',
    labelKey: 'home.link_preferences',
    featureGate: 'preference',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    path: '/profile',
    labelKey: 'home.link_mfa_setup',
    featureGate: 'mfa',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
]

const ADMIN_LINKS: QuickLinkConfig[] = [
  {
    path: '/admin/users',
    labelKey: 'home.link_user_management',
    permission: 'users.read',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    path: '/admin/roles',
    labelKey: 'home.link_role_management',
    permission: 'roles.read',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    path: '/admin/features',
    labelKey: 'home.link_feature_management',
    permission: 'features.read',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    path: '/admin/settings',
    labelKey: 'home.link_settings',
    permission: 'settings.read',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    path: '/admin/events',
    labelKey: 'home.link_event_log',
    permission: 'event.read',
    featureGate: 'event',
    icon: (
      <svg className="card-link-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
]

// ── Event timeline config ──

interface EventItem {
  id: number
  event_type: string
  actor_email: string
  resource_type: string
  resource_id: number
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

  if (diffMin < 1) return t('home.time_just_now')
  if (diffMin < 60) return t('home.time_minutes_ago', { count: diffMin })
  if (diffHours < 24) return t('home.time_hours_ago', { count: diffHours })
  return t('home.time_days_ago', { count: diffDays })
}

// ── Feature showcase config ──

const FEATURE_META: Record<string, { icon: ReactNode; route?: string; permission?: string }> = {
  event: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    route: '/admin/events',
    permission: 'event.read',
  },
  notification: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
    route: '/notifications',
  },
  mfa: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    route: '/profile',
  },
  sso: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  },
  preference: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>,
    route: '/profile/preferences',
  },
  rgpd: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
    route: '/rgpd/my-data',
  },
  storybook: {
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" /><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.14-.74-.39-1.04-.24-.3-.39-.65-.39-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.49-8.92-10-8.92z" /></svg>,
    route: '/admin/storybook',
    permission: 'storybook.read',
  },
}

const EXCLUDED_FEATURES = new Set(['_identity', 'i18n'])

// ── Sub-component: single stat card with its own useCountUp ──

function StatCardItem({ config, value, delay }: { config: StatCardConfig; value: number; delay: number }) {
  const counter = useCountUp(value, { delay })
  const { t } = useTranslation('_identity')

  const Tag = config.link ? Link : 'div'
  const tagProps = config.link ? { to: config.link } : {}

  return (
    <Tag
      {...tagProps as any}
      className={`stat-card stat-card--${config.variant} stat-glow card-hover-lift reveal-child`}
      aria-label={`${t(config.labelKey)} : ${counter.value}`}
    >
      <div className="stat-card-icon" aria-hidden="true">{config.icon}</div>
      <div className="stat-card-info">
        <div className="stat-card-value" ref={counter.ref}>{counter.value}</div>
        <div className="stat-card-label">{t(config.labelKey)}</div>
      </div>
      {config.pulse?.(value) && <div className="stat-card-pulse" aria-hidden="true" />}
    </Tag>
  )
}

// ── Main component ──

export default function Home() {
  const { t, i18n } = useTranslation('_identity')
  const { user } = useAuth()
  const { can } = usePermission()
  const { isActive, features } = useFeature()
  const [stats, setStats] = useState<Record<string, number>>({})
  const [recentEvents, setRecentEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  const statGridRef = useScrollReveal<HTMLDivElement>({ stagger: true })
  const timelineRef = useScrollReveal<HTMLOListElement>({ stagger: true })
  const featuresGridRef = useScrollReveal<HTMLDivElement>({ stagger: true })
  const userGridRef = useScrollReveal<HTMLDivElement>({ stagger: true })
  const adminGridRef = useScrollReveal<HTMLDivElement>({ stagger: true })

  const today = new Date().toLocaleDateString(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Filter stat cards by permission + feature gate
  const visibleStatCards = useMemo(
    () => STAT_CARDS.filter(c =>
      (!c.permission || can(c.permission)) &&
      (!c.featureGate || isActive(c.featureGate))
    ),
    [can, isActive]
  )

  // Filter quick access links
  const visibleUserLinks = useMemo(
    () => USER_LINKS.filter(l =>
      (!l.permission || can(l.permission)) &&
      (!l.featureGate || isActive(l.featureGate))
    ),
    [can, isActive]
  )

  const visibleAdminLinks = useMemo(
    () => ADMIN_LINKS.filter(l =>
      (!l.permission || can(l.permission)) &&
      (!l.featureGate || isActive(l.featureGate))
    ),
    [can, isActive]
  )

  // Show timeline if user can read events and feature is active
  const showTimeline = can('event.read') && isActive('event')

  // Build feature showcase list (parent features only, exclude infra)
  const showcaseFeatures = useMemo(() => {
    return Object.values(features)
      .filter((f: FeatureManifest) => !f.parent && !EXCLUDED_FEATURES.has(f.name))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [features])

  useEffect(() => {
    loadDashboard()
  }, [visibleStatCards.length, showTimeline])

  const loadDashboard = async () => {
    try {
      const statPromises = visibleStatCards.map(c => c.fetchStat().catch(() => 0))
      const eventsPromise = showTimeline
        ? api.get('/events/', { params: { per_page: 6, sort_dir: 'desc', show_all: true } }).catch(() => ({ data: { items: [] } }))
        : Promise.resolve({ data: { items: [] } })

      const [statResults, eventsRes] = await Promise.all([
        Promise.all(statPromises),
        eventsPromise,
      ])

      const newStats: Record<string, number> = {}
      visibleStatCards.forEach((c, i) => { newStats[c.id] = statResults[i] })
      setStats(newStats)
      setRecentEvents(eventsRes.data.items || [])
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }

  const showWelcomeBanner = !user?.last_login

  if (loading) {
    return (
      <Layout title={t('home.page_title')}>
        <div className="loading-screen" aria-busy="true">
          <div className="spinner" role="status">
            <span className="sr-only">{t('common:loading')}</span>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={t('home.page_title')}>
      <div className="page-wide">
        {/* Welcome */}
        <section className="section-mb-xl" aria-labelledby="home-greeting">
          <h1 className="title-lg" id="home-greeting">
            {t('home.greeting', { name: user?.first_name })}
          </h1>
          <p className="text-gray-500">{today}</p>
        </section>

        {/* Welcome banner for new users */}
        {showWelcomeBanner && (
          <aside className="home-welcome-banner" role="status" aria-labelledby="home-welcome-title">
            <div className="home-welcome-banner-title" id="home-welcome-title">{t('home.welcome_banner_title')}</div>
            <p className="home-welcome-banner-text">{t('home.welcome_banner_text')}</p>
          </aside>
        )}

        {/* Stat cards — permission-gated */}
        {visibleStatCards.length > 0 && (
          <section className="stat-grid section-mb-xl reveal-stagger" ref={statGridRef} aria-label={t('home.aria_stats_section')}>
            {visibleStatCards.map((card, index) => (
              <StatCardItem
                key={card.id}
                config={card}
                value={stats[card.id] || 0}
                delay={200 + index * 150}
              />
            ))}
          </section>
        )}

        {/* Recent activity timeline */}
        {showTimeline && (
          <section className="unified-card card-padded section-mb-xl" aria-labelledby="home-activity-title">
            <h2 className="home-section-title" id="home-activity-title">
              <svg className="home-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {t('home.activity_title')}
            </h2>
            {recentEvents.length === 0 ? (
              <div className="home-timeline-empty">{t('home.activity_empty')}</div>
            ) : (
              <>
                <ol className="home-timeline-list reveal-stagger" ref={timelineRef} aria-label={t('home.activity_title')}>
                  {recentEvents.map(evt => (
                    <li key={evt.id} className="home-timeline-item reveal-child">
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
                  <Link to="/admin/events">{t('home.activity_view_all')} →</Link>
                </div>
              </>
            )}
          </section>
        )}

        {/* Feature showcase */}
        {showcaseFeatures.length > 0 && (
          <section className="unified-card card-padded section-mb-xl" aria-labelledby="home-features-title">
            <h2 className="home-section-title" id="home-features-title">
              <svg className="home-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              {t('home.features_title')}
            </h2>
            <p className="home-features-subtitle">{t('home.features_subtitle')}</p>
            <div className="home-features-grid reveal-stagger" ref={featuresGridRef}>
              {showcaseFeatures.map(feature => {
                const meta = FEATURE_META[feature.name]
                const hasRoute = meta?.route && (!meta.permission || can(meta.permission))
                const Tag = hasRoute ? Link : 'div'
                const tagProps = hasRoute ? { to: meta!.route! } : {}

                return (
                  <Tag
                    key={feature.name}
                    {...tagProps as any}
                    className={`home-feature-card reveal-child${!feature.active ? ' home-feature-card--inactive' : ''}`}
                    aria-label={`${feature.label} — ${feature.active ? t('home.feature_active') : t('home.feature_inactive')}`}
                  >
                    <div className="home-feature-icon" aria-hidden="true">
                      {meta?.icon || (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                      )}
                    </div>
                    <div className="home-feature-info">
                      <div className="home-feature-name">{feature.label}</div>
                      <div className="home-feature-desc">{feature.description}</div>
                    </div>
                    <span className={`home-feature-badge home-feature-badge--${feature.active ? 'active' : 'inactive'}`}>
                      {feature.active ? t('home.feature_active') : t('home.feature_inactive')}
                    </span>
                  </Tag>
                )
              })}
            </div>
          </section>
        )}

        {/* Quick access: Your space */}
        {visibleUserLinks.length > 0 && (
          <section className="unified-card card-padded section-mb-xl" aria-labelledby="home-quick-access-title">
            <h2 className="home-section-title" id="home-quick-access-title">
              <svg className="home-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {t('home.quick_access_title')}
            </h2>
            <nav className="auto-grid-sm reveal-stagger" ref={userGridRef} aria-label={t('home.quick_access_title')}>
              {visibleUserLinks.map(link => (
                <Link key={link.path + link.labelKey} to={link.path} className="card-link-item reveal-child card-hover-lift">
                  <div className="unified-card">
                    <div className="card-link-item-content">
                      {link.icon}
                      <span className="card-link-item-label">{t(link.labelKey)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </nav>
          </section>
        )}

        {/* Quick access: Administration */}
        {visibleAdminLinks.length > 0 && (
          <section className="unified-card card-padded" aria-labelledby="home-admin-access-title">
            <h2 className="home-section-title" id="home-admin-access-title">
              <svg className="home-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {t('home.admin_access_title')}
            </h2>
            <nav className="auto-grid-sm reveal-stagger" ref={adminGridRef} aria-label={t('home.admin_access_title')}>
              {visibleAdminLinks.map(link => (
                <Link key={link.path} to={link.path} className="card-link-item reveal-child card-hover-lift">
                  <div className="unified-card">
                    <div className="card-link-item-content">
                      {link.icon}
                      <span className="card-link-item-label">{t(link.labelKey)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </nav>
          </section>
        )}
      </div>
    </Layout>
  )
}
