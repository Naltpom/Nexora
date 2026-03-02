import { useMemo, ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { usePermission } from '../../PermissionContext'
import { useFeature } from '../../FeatureContext'
import type { FeatureManifest } from '../../../types'

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
}

const EXCLUDED_FEATURES = new Set(['_identity', 'i18n'])

export default function FeatureShowcaseWidget({ widgetId: _widgetId, size: _size }: { widgetId: string; size: string }) {
  const { t } = useTranslation('dashboard')
  const { can } = usePermission()
  const { features } = useFeature()

  const showcaseFeatures = useMemo(() => {
    return Object.values(features)
      .filter((f: FeatureManifest) => !f.parent && !EXCLUDED_FEATURES.has(f.name))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [features])

  if (showcaseFeatures.length === 0) return null

  return (
    <div className="dashboard-feature-showcase">
      <h3 className="home-section-title">
        <svg className="home-section-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        {t('features_title')}
      </h3>
      <p className="home-features-subtitle">{t('features_subtitle')}</p>
      <div className="home-features-grid">
        {showcaseFeatures.map(feature => {
          const meta = FEATURE_META[feature.name]
          const hasRoute = meta?.route && (!meta.permission || can(meta.permission))
          const Tag = hasRoute ? Link : 'div'
          const tagProps = hasRoute ? { to: meta!.route! } : {}

          return (
            <Tag
              key={feature.name}
              {...tagProps as any}
              className={`home-feature-card${!feature.active ? ' home-feature-card--inactive' : ''}`}
              aria-label={`${feature.label} — ${feature.active ? t('feature_active') : t('feature_inactive')}`}
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
                {feature.active ? t('feature_active') : t('feature_inactive')}
              </span>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}
