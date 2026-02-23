import { useState, useRef, useEffect } from 'react'

export interface MultiSelectOption {
  value: string
  label: string
  color?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export default function MultiSelect({ options, values, onChange, placeholder, className }: MultiSelectProps) {
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

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpen = () => {
    setOpen(!open)
    setSearch('')
    if (!open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const handleToggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter(v => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  return (
    <div className={`multi-select-container ${className || ''}`} ref={containerRef}>
      <button className="multi-select-trigger" onClick={handleOpen} type="button">
        {values.length === 0 ? (
          <span className="multi-select-trigger-placeholder">{placeholder || 'Select...'}</span>
        ) : (
          <span className="multi-select-trigger-count">{values.length} / {options.length}</span>
        )}
        <svg className="multi-select-trigger-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="multi-select-dropdown">
          <div className="multi-select-search">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder || 'Search...'}
            />
          </div>
          {filtered.map(o => (
            <label key={o.value} className="multi-select-option">
              <input
                type="checkbox"
                checked={values.includes(o.value)}
                onChange={() => handleToggle(o.value)}
              />
              {o.color && (
                <span
                  className="multi-select-color-dot"
                  style={{ background: o.color } as React.CSSProperties}
                />
              )}
              {o.label}
            </label>
          ))}
          {filtered.length === 0 && (
            <div className="multi-select-empty">-</div>
          )}
        </div>
      )}
    </div>
  )
}
