import type { SortDirection, SortType } from './useSortableTable'

interface SortableHeaderProps {
  label: string
  sortKey: string
  sortType: SortType
  currentKey: string
  currentDir: SortDirection
  onSort: (key: string, type: SortType) => void
}

export function SortableHeader({ label, sortKey, sortType, currentKey, currentDir, onSort }: SortableHeaderProps) {
  const isActive = currentKey === sortKey

  return (
    <th className="th-sortable" onClick={() => onSort(sortKey, sortType)}>
      {label}
      <svg
        className={`sort-icon${isActive ? ' sort-icon--active' : ''}${isActive && currentDir === 'desc' ? ' sort-icon--desc' : ''}`}
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <polyline points="6 9 12 4 18 9" />
        <polyline points="6 15 12 20 18 15" />
      </svg>
    </th>
  )
}
