import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../AuthContext'
import { useNavigationItems, type AdminGroupData } from './useNavigationItems'
import { NavIcon } from './icons'
import type { NavItem } from './types'
import './UserMenu.scss'

export default function UserMenu() {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  const { userItems, adminGroups } = useNavigationItems()
  const [open, setOpen] = useState(false)
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) setHoveredGroup(null)
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
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-menu-fullname">
              {user.first_name} {user.last_name}
            </div>
          </div>

          <div className="user-menu-separator" />

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
                <AdminGroupTrigger
                  key={group.key}
                  group={group}
                  isOpen={hoveredGroup === group.key}
                  onEnter={handleGroupEnter}
                  onLeave={handleGroupLeave}
                  isMenuActive={isMenuActive}
                  onClose={closeAll}
                />
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
  isMenuActive: (path: string) => boolean
  onClose: () => void
}) {
  const hasActiveItem = group.items.some(item => isMenuActive(item.path))

  return (
    <div
      className="user-menu-flyout"
      onMouseEnter={() => onEnter(group.key)}
      onMouseLeave={onLeave}
    >
      <div
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

      {isOpen && (
        <div className="user-menu-flyout-panel">
          {group.items.map(item => (
            <MenuItemLink
              key={item.path}
              item={item}
              isActive={isMenuActive(item.path)}
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
