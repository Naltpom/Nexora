import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../AuthContext'
import { useFeature } from '../FeatureContext'
import { useCommandPalette } from '../search/CommandPaletteProvider'
import { useNavigationItems, type AdminGroupData } from './useNavigationItems'
import { NavIcon } from './icons'
import type { NavItem } from './types'
import { useMediaQuery } from '../hooks/useMediaQuery'
import './UserMenu.scss'

export default function UserMenu() {
  const { t } = useTranslation('common')
  const { t: tSearch } = useTranslation('search')
  const { user, logout } = useAuth()
  const { isActive } = useFeature()
  const { open: openSearch } = useCommandPalette()
  const { userItems, adminGroups } = useNavigationItems()
  const [open, setOpen] = useState(false)
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [dropUp, setDropUp] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        if (target.closest?.('.user-menu-flyout-panel')) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) {
      setHoveredGroup(null)
      setExpandedGroup(null)
      setDropUp(false)
    }
  }, [open])

  useLayoutEffect(() => {
    if (open && panelRef.current && dropdownRef.current) {
      const trigger = dropdownRef.current.getBoundingClientRect()
      const panel = panelRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - trigger.bottom - 8
      const spaceAbove = trigger.top - 8
      if (panel.height > spaceBelow && spaceAbove > spaceBelow) {
        setDropUp(true)
      }
    }
  }, [open])

  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current) }
  }, [])

  const handleGroupEnter = useCallback((key: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setHoveredGroup(key)
  }, [])

  const handleGroupLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setHoveredGroup(null), 150)
  }, [])

  if (!user) return null

  const isMenuActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/')

  const handleLogout = () => {
    logout()
    navigate('/login')
    setOpen(false)
  }

  const closeAll = () => {
    setOpen(false)
  }

  const avatarInitial = user.first_name?.charAt(0).toUpperCase() || '?'

  return (
    <div className="user-menu" ref={dropdownRef}>
      <button className="user-menu-trigger" onClick={() => setOpen(!open)}>
        <div className="user-menu-avatar">{avatarInitial}</div>
        <span className="user-menu-name">{user.first_name}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`user-menu-chevron ${open ? 'open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className={`user-menu-dropdown${dropUp ? ' user-menu-dropdown-up' : ''}`} ref={panelRef}>
          <div className="user-menu-header">
            <div className="user-menu-fullname">
              {user.first_name} {user.last_name}
            </div>
          </div>

          <div className="user-menu-separator" />

          {isMobile && isActive('search') && (
            <div
              className="user-menu-item"
              onClick={() => { openSearch(); closeAll() }}
            >
              <NavIcon name="search" />
              {tSearch('trigger_placeholder')}
            </div>
          )}

          {userItems.map(item => (
            <MenuItemLink
              key={item.path}
              item={item}
              isActive={isMenuActive(item.path, item.path === '/profile')}
              onClose={closeAll}
            />
          ))}

          {adminGroups.length > 0 && (
            <>
              <div className="user-menu-separator" />
              {adminGroups.map(group => (
                isMobile ? (
                  <AdminGroupAccordion
                    key={group.key}
                    group={group}
                    isExpanded={expandedGroup === group.key}
                    onToggle={(key) => setExpandedGroup(prev => prev === key ? null : key)}
                    isMenuActive={isMenuActive}
                    onClose={closeAll}
                  />
                ) : (
                  <AdminGroupTrigger
                    key={group.key}
                    group={group}
                    isOpen={hoveredGroup === group.key}
                    onEnter={handleGroupEnter}
                    onLeave={handleGroupLeave}
                    isMenuActive={isMenuActive}
                    onClose={closeAll}
                  />
                )
              ))}
            </>
          )}

          <div className="user-menu-separator" />

          <div
            className="user-menu-item user-menu-item-danger"
            onClick={handleLogout}
          >
            <NavIcon name="log-out" />
            {t('logout')}
          </div>
        </div>
      )}
    </div>
  )
}

function AdminGroupTrigger({
  group,
  isOpen,
  onEnter,
  onLeave,
  isMenuActive,
  onClose,
}: {
  group: AdminGroupData
  isOpen: boolean
  onEnter: (key: string) => void
  onLeave: () => void
  isMenuActive: (path: string, exact?: boolean) => boolean
  onClose: () => void
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)
  const hasActiveItem = group.items.some(item => isMenuActive(item.path))

  useLayoutEffect(() => {
    if (isOpen && triggerRef.current && flyoutRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const panel = flyoutRef.current
      const panelHeight = panel.offsetHeight
      const panelWidth = panel.offsetWidth

      const minTop = 64
      let top = rect.top
      if (top + panelHeight > window.innerHeight - 20) {
        top = window.innerHeight - panelHeight - 20
      }
      if (top < minTop) top = minTop

      let left = rect.left - panelWidth - 6
      if (left < 10) {
        left = rect.right + 6
      }

      panel.style.top = `${top}px`
      panel.style.left = `${left}px`
    }
  }, [isOpen])

  return (
    <div
      className="user-menu-flyout"
      onMouseEnter={() => onEnter(group.key)}
      onMouseLeave={onLeave}
    >
      <div
        ref={triggerRef}
        className={`user-menu-item user-menu-group-trigger${hasActiveItem ? ' user-menu-group-trigger-active' : ''}${isOpen ? ' user-menu-group-trigger-hover' : ''}`}
      >
        <NavIcon name={group.icon} />
        <span className="user-menu-group-trigger-label">{group.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="user-menu-flyout-chevron"
        >
          <polyline points="9 6 15 12 9 18" />
        </svg>
      </div>

      {isOpen && createPortal(
        <div
          className="user-menu-flyout-panel"
          ref={flyoutRef}
          onMouseEnter={() => onEnter(group.key)}
          onMouseLeave={onLeave}
        >
          {group.items.map(item => (
            <MenuItemLink
              key={item.path}
              item={item}
              isActive={isMenuActive(item.path, item.exact)}
              onClose={onClose}
            />
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}

function AdminGroupAccordion({
  group,
  isExpanded,
  onToggle,
  isMenuActive,
  onClose,
}: {
  group: AdminGroupData
  isExpanded: boolean
  onToggle: (key: string) => void
  isMenuActive: (path: string, exact?: boolean) => boolean
  onClose: () => void
}) {
  const hasActiveItem = group.items.some(item => isMenuActive(item.path))

  return (
    <div className="user-menu-accordion">
      <div
        className={`user-menu-item user-menu-group-trigger${hasActiveItem ? ' user-menu-group-trigger-active' : ''}${isExpanded ? ' user-menu-group-trigger-hover' : ''}`}
        onClick={() => onToggle(group.key)}
      >
        <NavIcon name={group.icon} />
        <span className="user-menu-group-trigger-label">{group.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`user-menu-accordion-chevron${isExpanded ? ' user-menu-accordion-chevron-open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {isExpanded && (
        <div className="user-menu-accordion-items">
          {group.items.map(item => (
            <MenuItemLink
              key={item.path}
              item={item}
              isActive={isMenuActive(item.path, item.exact)}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MenuItemLink({ item, isActive, onClose }: { item: NavItem; isActive: boolean; onClose: () => void }) {
  return (
    <Link
      to={item.path}
      className={`user-menu-item${isActive ? ' user-menu-item-active' : ''}`}
      onClick={onClose}
    >
      <NavIcon name={item.icon} />
      {item.label}
    </Link>
  )
}
