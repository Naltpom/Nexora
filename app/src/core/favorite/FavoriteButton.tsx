import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { renderFavoriteIcon } from './favoriteIcons'
import api from '../../api'
import './favorite.scss'

interface FavoriteItem {
  id: number
  label: string
  icon: string | null
  url: string
  position: number
  created_at: string
}

export default function FavoriteButton() {
  const { t } = useTranslation('favorite')
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [justAdded, setJustAdded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await api.get('/favorites/')
      setFavorites(res.data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    const opening = !open
    setOpen(opening)
    if (opening) {
      fetchFavorites()
      setJustAdded(false)
    }
  }

  const handleAddPage = async () => {
    const url = location.pathname + location.search
    const label = document.title.split(' | ')[0] || location.pathname
    try {
      await api.post('/favorites/', { label, url })
      setJustAdded(true)
      fetchFavorites()
      setTimeout(() => setJustAdded(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleNavigate = (url: string) => {
    navigate(url)
    setOpen(false)
  }

  return (
    <div className="favorite-bell" ref={dropdownRef}>
      <button
        className="favorite-bell-btn"
        onClick={handleToggle}
        title={t('btn_title')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>

      {open && (
        <div className="favorite-dropdown">
          <div className="favorite-dropdown-header">
            <span className="favorite-dropdown-title">{t('dropdown_title')}</span>
          </div>

          <div className="favorite-dropdown-list">
            {favorites.length === 0 ? (
              <div className="favorite-dropdown-empty">
                <svg className="favorite-empty-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {t('dropdown_empty')}
              </div>
            ) : (
              favorites.map(fav => (
                <div
                  key={fav.id}
                  className="favorite-dropdown-item"
                  onClick={() => handleNavigate(fav.url)}
                >
                  <div className="favorite-dropdown-item-icon">
                    {renderFavoriteIcon(fav.icon)}
                  </div>
                  <span className="favorite-dropdown-item-label">{fav.label}</span>
                  <span className="favorite-dropdown-item-url">{fav.url}</span>
                </div>
              ))
            )}
          </div>

          <button
            className="favorite-dropdown-add"
            onClick={handleAddPage}
            disabled={justAdded}
          >
            {justAdded ? (
              <>
                <svg className="favorite-add-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('dropdown_added')}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('dropdown_add_page')}
              </>
            )}
          </button>

          <div className="favorite-dropdown-footer">
            <Link to="/favorites" onClick={() => setOpen(false)}>
              {t('dropdown_view_all')}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
