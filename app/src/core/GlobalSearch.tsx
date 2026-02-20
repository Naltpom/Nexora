import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

interface SearchResults {
  users: { id: number; first_name: string; last_name: string; email: string }[]
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const doSearch = async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get('/search', { params: { q } })
      setResults(res.data)
      setOpen(true)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  const clearSearch = () => {
    setOpen(false)
    setQuery('')
    setResults(null)
  }

  const hasResults = results && results.users.length > 0

  return (
    <div className="global-search-container" ref={containerRef}>
      <div className="global-search-input-wrapper">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="global-search-input"
          placeholder="Rechercher..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results && query.length >= 2) setOpen(true) }}
        />
      </div>
      {open && (
        <div className="global-search-dropdown">
          {loading && <div className="global-search-loading">Recherche...</div>}
          {!loading && !hasResults && query.length >= 2 && (
            <div className="global-search-empty">Aucun resultat</div>
          )}
          {!loading && hasResults && (
            <>
              {results!.users.length > 0 && (
                <div className="global-search-group">
                  <div className="global-search-group-title">Utilisateurs</div>
                  {results!.users.map(u => (
                    <Link key={`u-${u.id}`} to={`/admin/users`} className="global-search-item" onClick={clearSearch}>
                      <span className="global-search-item-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <span className="global-search-item-text">{u.first_name} {u.last_name}</span>
                      <span className="global-search-item-code">{u.email}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
