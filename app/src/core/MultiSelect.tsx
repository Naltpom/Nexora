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

  const selectedSet = new Set(values)
  const filtered = options.filter(o =>
    !selectedSet.has(o.value) && o.label.toLowerCase().includes(search.toLowerCase()),
  )
  const selectedOptions = values
    .map(v => options.find(o => o.value === v))
    .filter(Boolean) as MultiSelectOption[]

  const handleAdd = (val: string) => {
    onChange([...values, val])
    setSearch('')
    inputRef.current?.focus()
  }

  const handleRemove = (val: string) => {
    onChange(values.filter(v => v !== val))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && search === '' && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className={`multi-select-container ${className || ''}`} ref={containerRef}>
      <div
        className="multi-select-control"
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        {selectedOptions.map(opt => (
          <span key={opt.value} className="multi-select-badge">
            {opt.color && (
              <span
                className="multi-select-color-dot"
                style={{ '--dot-color': opt.color } as React.CSSProperties}
              />
            )}
            <span className="multi-select-badge-label">{opt.label}</span>
            <button
              type="button"
              className="multi-select-badge-remove"
              onClick={e => { e.stopPropagation(); handleRemove(opt.value) }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="multi-select-input"
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedOptions.length === 0 ? (placeholder || '--') : ''}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="multi-select-dropdown">
          {filtered.map(o => (
            <div
              key={o.value}
              className="multi-select-option"
              onMouseDown={e => { e.preventDefault(); handleAdd(o.value) }}
            >
              {o.color && (
                <span
                  className="multi-select-color-dot"
                  style={{ '--dot-color': o.color } as React.CSSProperties}
                />
              )}
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
