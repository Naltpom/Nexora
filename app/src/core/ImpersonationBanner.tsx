import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import { useConfirm } from './ConfirmModal'
import api from '../api'

export default function ImpersonationBanner() {
  const { t } = useTranslation('common')
  const { isImpersonating, impersonatedUser, stopImpersonation, searchUsersForImpersonation } = useAuth()
  const { confirm, alert } = useConfirm()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    searchTimeout.current = setTimeout(async () => {
      if (query.length >= 2) {
        setLoading(true)
        const results = await searchUsersForImpersonation(query)
        setSearchResults(results)
        setShowDropdown(true)
        setLoading(false)
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    }, 300)
  }

  const handleSwitchUser = async (userId: number) => {
    setSwitching(true)
    const currentPath = window.location.pathname
    try {
      const response = await api.post(`/impersonation/switch/${userId}`)
      const { access_token, refresh_token } = response.data

      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      setSearchQuery('')
      setSearchResults([])
      setShowDropdown(false)

      window.location.href = currentPath
    } catch (error: any) {
      await alert({ message: error.message || t('impersonation_switch_error'), variant: 'danger' })
      setSwitching(false)
    }
  }

  const handleStop = async () => {
    const confirmed = await confirm({
      title: t('impersonation_quit_title'),
      message: t('impersonation_quit_message'),
      confirmText: t('impersonation_quit'),
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      await stopImpersonation()
    } catch (error: any) {
      await alert({ message: error.message || t('impersonation_exit_error'), variant: 'danger' })
    }
  }

  if (!isImpersonating) return null

  return (
    <div className="impersonation-banner">
      <div className="impersonation-banner-content">
        <div className="impersonation-banner-left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="impersonation-banner-text">
            {t('impersonation_active')} <strong>{impersonatedUser?.name}</strong>
          </span>
        </div>

        <div className="impersonation-banner-actions">
          <div className="impersonation-search-container" ref={dropdownRef}>
            <input
              type="text"
              className="impersonation-search-input"
              placeholder={t('impersonation_switch_user')}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              disabled={switching}
            />
            {showDropdown && (
              <div className="impersonation-search-dropdown">
                {loading && <div className="impersonation-search-loading">{t('impersonation_searching')}</div>}
                {!loading && searchResults.length === 0 && (
                  <div className="impersonation-search-empty">{t('impersonation_no_user_found')}</div>
                )}
                {!loading && searchResults.map(user => (
                  <div
                    key={user.id}
                    className="impersonation-search-item"
                    onClick={() => handleSwitchUser(user.id)}
                  >
                    <div className="impersonation-search-item-main">
                      <span className="impersonation-search-item-name">{user.full_name}</span>
                      <span className="impersonation-search-item-email">{user.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn-impersonation-stop"
            onClick={handleStop}
            disabled={switching}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('impersonation_quit_button')}
          </button>
        </div>
      </div>
    </div>
  )
}
