import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../api'
import { SearchResultGroup } from './types'
import { transformSearchResults } from './searchRegistry'

interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: SearchResultGroup[]
  loading: boolean
  hasResults: boolean
  clear: () => void
}

/**
 * Hook for global search via the command palette.
 * Calls GET /api/search?q=&limit=5, debounces 300ms, minimum 2 chars.
 */
export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultGroup[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchResults = useCallback(async (searchQuery: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }

    if (searchQuery.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const response = await api.get('/search', {
        params: { q: searchQuery.trim(), limit: 5 },
        signal: controller.signal,
      })
      // API returns { results: { users: { hits: [...] }, ... }, query }
      const rawResults: Record<string, any[]> = {}
      const apiResults = response.data?.results || {}
      for (const [category, indexResult] of Object.entries(apiResults)) {
        const ir = indexResult as any
        if (ir?.hits?.length > 0) {
          rawResults[category] = ir.hits
        }
      }
      const groups = transformSearchResults(rawResults)
      setResults(groups)
    } catch (err: any) {
      // Don't update state if the request was aborted
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
      setResults([])
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(() => {
      fetchResults(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, fetchResults])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setLoading(false)
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  return {
    query,
    setQuery,
    results,
    loading,
    hasResults: results.length > 0,
    clear,
  }
}
