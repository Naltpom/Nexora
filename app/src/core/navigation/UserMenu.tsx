import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useNavigationItems } from './useNavigationItems'
import { NavIcon } from './icons'
import type { NavItem } from './types'
import './UserMenu.scss'

export default function UserMenu() {
  const { user, logout } = useAuth()
  const { userItems, adminGroups } = useNavigationItems()
  const [open, setOpen] = useState(false)
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

  if (!user) return null

  const isMenuActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/')

  const handleLogout = () => {
    logout()
    navigate('/login')
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
              onClose={() => setOpen(false)}
            />
          ))}

          {adminGroups.map(group => (
            <div key={group.key}>
              <div className="user-menu-separator" />
              <div className="user-menu-group-label">{group.label}</div>
              {group.items.map(item => (
                <MenuItemLink
                  key={item.path}
                  item={item}
                  isActive={isMenuActive(item.path)}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          ))}

          <div className="user-menu-separator" />

          <div
            className="user-menu-item user-menu-item-danger"
            onClick={handleLogout}
          >
            <NavIcon name="log-out" />
            Deconnexion
          </div>
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
