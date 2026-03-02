import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useSearch } from './useSearch'
import { SearchResultItem } from './SearchResultItem'
import { SearchResult } from './types'
import './search.scss'

interface CommandPaletteProps {
  onClose: () => void
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const { t } = useTranslation('search')
  const navigate = useNavigate()
  const { query, setQuery, results, loading, hasResults, clear } = useSearch()
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Flatten all results for keyboard navigation
  const flatResults: SearchResult[] = results.flatMap((group) => group.results)

  // Auto-focus input on open
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.onSelect) {
        result.onSelect()
      } else if (result.link) {
        navigate(result.link)
      }
      clear()
      onClose()
    },
    [navigate, onClose, clear],
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => (prev + 1) % Math.max(flatResults.length, 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => (prev - 1 + flatResults.length) % Math.max(flatResults.length, 1))
          break
        case 'Enter':
          e.preventDefault()
          if (flatResults[activeIndex]) {
            handleSelect(flatResults[activeIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [flatResults, activeIndex, handleSelect, onClose],
  )

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeItem = listRef.current.querySelector('.command-palette-item--active')
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Compute a global flat index for each result to match activeIndex
  let flatIndex = 0

  return (
    <div className="command-palette-overlay" onClick={handleOverlayClick}>
      <div className="command-palette" onKeyDown={handleKeyDown}>
        <div className="command-palette-input-wrapper">
          <svg
            className="command-palette-input-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="command-palette-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('palette_placeholder')}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="command-palette-input-kbd">{t('palette_esc_hint')}</kbd>
        </div>

        <div className="command-palette-body" ref={listRef}>
          {loading && (
            <div className="command-palette-loading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              {t('palette_loading')}
            </div>
          )}

          {!loading && query.trim().length < 2 && (
            <div className="command-palette-hint">{t('palette_empty_hint')}</div>
          )}

          {!loading && query.trim().length >= 2 && !hasResults && (
            <div className="command-palette-empty">{t('palette_no_results', { query })}</div>
          )}

          {!loading &&
            results.map((group) => (
              <div className="command-palette-group" key={group.category}>
                <div className="command-palette-group-title">{t(group.labelKey.replace('search:', ''))}</div>
                {group.results.map((result) => {
                  const currentIndex = flatIndex++
                  return (
                    <SearchResultItem
                      key={`${result.category}-${result.id}`}
                      result={result}
                      isActive={currentIndex === activeIndex}
                      onClick={() => handleSelect(result)}
                    />
                  )
                })}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
