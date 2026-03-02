import { SearchResult } from './types'

interface SearchResultItemProps {
  result: SearchResult
  isActive: boolean
  onClick: () => void
}

/** Default icon for user results */
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/** Default icon for announcement results */
function AnnouncementIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M2 8c0-3.3 2.7-6 6-6" />
      <path d="M22 8c0-3.3-2.7-6-6-6" />
    </svg>
  )
}

/** Fallback icon for unknown categories */
function DefaultIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

/** Map category to icon component */
function getCategoryIcon(category: string) {
  switch (category) {
    case 'users':
      return <UserIcon />
    case 'announcements':
      return <AnnouncementIcon />
    default:
      return <DefaultIcon />
  }
}

export function SearchResultItem({ result, isActive, onClick }: SearchResultItemProps) {
  const icon = result.icon ?? getCategoryIcon(result.category)

  return (
    <div
      className={`command-palette-item${isActive ? ' command-palette-item--active' : ''}`}
      onClick={onClick}
      role="option"
      aria-selected={isActive}
    >
      <div className="command-palette-item-icon">{icon}</div>
      <div className="command-palette-item-content">
        <div className="command-palette-item-title">{result.title}</div>
        {result.subtitle && <div className="command-palette-item-subtitle">{result.subtitle}</div>}
      </div>
      {result.badge && <span className="command-palette-item-badge">{result.badge}</span>}
    </div>
  )
}
