import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../api'

interface UseTableSearchOptions {
  indexName: string
  enabled?: boolean
  limit?: number
  offset?: number
}

interface UseTableSearchReturn {
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: any[] | null
  searchTotal: number
  isSearchActive: boolean
}

/**
 * Optional hook for table search acceleration.
 * Calls GET /api/search/{indexName}?q=&limit=&offset= with debounce.
 * Falls back gracefully if the endpoint returns an error.
 */
export function useTableSearch(opts: UseTableSearchOptions): UseTableSearchReturn {
  const { indexName, enabled = false, limit = 20, offset = 0 } = opts
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searchTotal, setSearchTotal] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isSearchActive = enabled && searchQuery.trim().length >= 2

  const fetchResults = useCallback(async (q: string) => {
    if (abortRef.current) {
      abortRef.current.abort()
    }

    if (!enabled || q.trim().length < 2) {
      setSearchResults(null)
      setSearchTotal(0)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await api.get(`/search/${indexName}`, {
        params: { q: q.trim(), limit, offset },
        signal: controller.signal,
      })
      setSearchResults(response.data.items ?? response.data.results ?? response.data)
      setSearchTotal(response.data.total ?? response.data.count ?? 0)
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      // Fallback: endpoint not available or error, reset to null so caller uses default
      setSearchResults(null)
      setSearchTotal(0)
    }
  }, [enabled, indexName, limit, offset])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!enabled || searchQuery.trim().length < 2) {
      setSearchResults(null)
      setSearchTotal(0)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(searchQuery)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchQuery, enabled, fetchResults])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchTotal,
    isSearchActive,
  }
}
