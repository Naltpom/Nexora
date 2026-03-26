import { useState, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc'
export type SortType = 'alpha' | 'number' | 'date'

export function useSortableTable<T>(data: T[], defaultKey?: string, defaultDir: SortDirection = 'asc') {
  const [sortKey, setSortKey] = useState(defaultKey || '')
  const [sortDir, setSortDir] = useState<SortDirection>(defaultDir)

  const requestSort = (key: string, _type: SortType) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortDir === 'asc' ? 1 : -1
      if (bVal == null) return sortDir === 'asc' ? -1 : 1

      let cmp = 0

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        // Try date parsing if values look like ISO dates
        const aDate = Date.parse(aVal)
        const bDate = Date.parse(bVal)
        if (!isNaN(aDate) && !isNaN(bDate) && aVal.includes('-')) {
          cmp = aDate - bDate
        } else {
          cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' })
        }
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' })
      }

      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  return { sortedData, sortKey, sortDir, requestSort }
}
