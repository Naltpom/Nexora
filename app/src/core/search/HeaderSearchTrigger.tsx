import { useTranslation } from 'react-i18next'
import { useCommandPalette } from './CommandPaletteProvider'
import './search.scss'

/**
 * Simplified search trigger for the header bar.
 * Displays as a search-like button that opens the command palette.
 * No API calls -- purely a trigger.
 */
export function HeaderSearchTrigger() {
  const { t } = useTranslation('search')
  const { open } = useCommandPalette()

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const shortcutLabel = isMac ? t('trigger_shortcut_mac') : t('trigger_shortcut')

  return (
    <button className="search-trigger" onClick={open} type="button">
      <svg
        className="search-trigger-icon"
        width="16"
        height="16"
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
      <span className="search-trigger-text">{t('trigger_placeholder')}</span>
      <kbd className="search-trigger-kbd">{shortcutLabel}</kbd>
    </button>
  )
}
