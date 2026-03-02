import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useCountUp } from '../../hooks'
import api from '../../../api'

interface StatConfig {
  labelKey: string
  variant: string
  link: string
  endpoint: string
  icon: React.ReactNode
}

const STAT_CONFIGS: Record<string, StatConfig> = {
  stats_users: {
    labelKey: 'widget_users',
    variant: 'users',
    link: '/admin/users',
    endpoint: '/dashboard/widgets/stats/users',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  stats_notifications: {
    labelKey: 'widget_notifications',
    variant: 'notifs',
    link: '/notifications',
    endpoint: '/dashboard/widgets/stats/notifications',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  stats_invitations: {
    labelKey: 'widget_invitations',
    variant: 'invites',
    link: '/admin/users?tab=invitations',
    endpoint: '/dashboard/widgets/stats/invitations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  stats_events: {
    labelKey: 'widget_events',
    variant: 'events',
    link: '/admin/events',
    endpoint: '/dashboard/widgets/stats/events',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
}

export default function StatWidget({ widgetId }: { widgetId: string; size: string }) {
  const { t } = useTranslation('dashboard')
  const [value, setValue] = useState(0)
  const config = STAT_CONFIGS[widgetId]
  const counter = useCountUp(value, { delay: 200 })

  useEffect(() => {
    if (!config) return
    api.get(config.endpoint)
      .then(res => setValue(res.data.count || 0))
      .catch(() => setValue(0))
  }, [config])

  if (!config) return null

  return (
    <Link
      to={config.link}
      className={`stat-card stat-card--${config.variant} stat-glow card-hover-lift`}
      aria-label={`${t(config.labelKey)} : ${counter.value}`}
    >
      <div className="stat-card-icon" aria-hidden="true">{config.icon}</div>
      <div className="stat-card-info">
        <div className="stat-card-value" ref={counter.ref}>{counter.value}</div>
        <div className="stat-card-label">{t(config.labelKey)}</div>
      </div>
    </Link>
  )
}
