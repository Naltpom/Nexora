import { useState, useRef, useEffect } from 'react'

interface Option {
  value: string
  label: string
}

interface SearchSelectProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyLabel?: string
  className?: string
}

export default function SearchSelect({ options, value, onChange, placeholder = 'Rechercher...', emptyLabel = '-- Aucun --', className }: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedOption = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpen = () => {
    setOpen(true)
    setSearch('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className={`search-select ${className || ''}`} ref={containerRef}>
      <button className="search-select-trigger" onClick={handleOpen} type="button">
        <span className={selectedOption ? '' : 'search-select-placeholder'}>
          {selectedOption ? selectedOption.label : emptyLabel}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="search-select-dropdown">
          <div className="search-select-search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
            />
          </div>
          <div className="search-select-options">
            <div
              className={`search-select-option ${!value ? 'active' : ''}`}
              onClick={() => handleSelect('')}
            >
              {emptyLabel}
            </div>
            {filtered.map(o => (
              <div
                key={o.value}
                className={`search-select-option ${o.value === value ? 'active' : ''}`}
                onClick={() => handleSelect(o.value)}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="search-select-empty">Aucun resultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
