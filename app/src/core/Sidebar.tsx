import { useState, useCallback, useMemo, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useNavigationItems } from './navigation/useNavigationItems'
import { NavIcon } from './navigation/icons'
import { useAuth } from './AuthContext'
import { useMediaQuery } from './hooks/useMediaQuery'
import type { NavItem } from './navigation/types'

export default function Sidebar() {
  const { user, getPreference, updatePreference } = useAuth()
  const { sidebarItems } = useNavigationItems()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Collect namespaces from sidebar items' labelKeys for pre-loading
  const namespaces = useMemo(() => {
    const ns = new Set<string>(['common'])
    sidebarItems.forEach(item => {
      if (item.labelKey) {
        const parts = item.labelKey.split(':')
        if (parts.length > 1) ns.add(parts[0])
      }
    })
    return Array.from(ns)
  }, [sidebarItems])

  const { t, ready } = useTranslation(namespaces)

  // Force re-render when lazy namespaces finish loading
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    if (!ready) return
    forceUpdate((n: number) => n + 1)
  }, [ready])

  const defaultCollapsed = getPreference('sidebar_collapsed', false)
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed
    setCollapsed(next)
    updatePreference('sidebar_collapsed', next)
  }, [collapsed, updatePreference])

  if (!user || sidebarItems.length === 0) return null

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const resolveLabel = (item: NavItem) => {
    if (!item.labelKey) return item.label
    const result = t(item.labelKey)
    // If namespace not loaded yet, t() returns the raw key — fall back to hardcoded label
    const rawKey = item.labelKey.includes(':') ? item.labelKey.split(':')[1] : item.labelKey
    return result === rawKey ? item.label : result
  }

  // Mobile: hamburger button + overlay sidebar
  if (isMobile) {
    return (
      <>
        <button
          className="sidebar-mobile-trigger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={t('common:sidebar_expand')}
        >
          <NavIcon name="menu" />
        </button>

        {mobileOpen && (
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
        )}

        <aside className={`sidebar sidebar-mobile${mobileOpen ? ' sidebar-mobile-open' : ''}`}>
          <nav className="sidebar-nav">
            <SidebarLinkResolved
              label={t('common:dashboard')}
              path="/dashboard"
              icon="home"
              isActive={isActive('/dashboard')}
              onClose={() => setMobileOpen(false)}
            />
            <div className="sidebar-separator" />
            {sidebarItems.map(item => (
              <SidebarLinkResolved
                key={item.path}
                label={resolveLabel(item)}
                path={item.path}
                icon={item.icon}
                isActive={isActive(item.path)}
                onClose={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </aside>
      </>
    )
  }

  // Desktop: persistent sidebar
  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <SidebarLinkResolved
          label={t('common:dashboard')}
          path="/dashboard"
          icon="home"
          isActive={isActive('/dashboard')}
          collapsed={collapsed}
        />
        <div className="sidebar-separator" />
        {sidebarItems.map(item => (
          <SidebarLinkResolved
            key={item.path}
            label={resolveLabel(item)}
            path={item.path}
            icon={item.icon}
            isActive={isActive(item.path)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          title={collapsed ? t('common:sidebar_expand') : t('common:sidebar_collapse')}
        >
          <NavIcon name={collapsed ? 'panel-left-open' : 'panel-left-close'} />
        </button>
      </div>
    </aside>
  )
}

function SidebarLinkResolved({
  label,
  path,
  icon,
  isActive,
  collapsed = false,
  onClose,
}: {
  label: string
  path: string
  icon: string
  isActive: boolean
  collapsed?: boolean
  onClose?: () => void
}) {
  return (
    <Link
      to={path}
      className={`sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
      title={collapsed ? label : undefined}
      onClick={onClose}
    >
      <span className="sidebar-link-icon">
        <NavIcon name={icon} />
      </span>
      {!collapsed && <span className="sidebar-link-label">{label}</span>}
    </Link>
  )
}
