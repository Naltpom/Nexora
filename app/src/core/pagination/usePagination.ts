import { useState, useRef, useCallback } from 'react'

export interface PaginationState {
  page: number
  totalPages: number
  total: number
  perPage: number
}

export interface UsePaginationOptions {
  defaultPerPage?: number
  defaultSortBy?: string
  defaultSortDir?: 'asc' | 'desc'
}

export interface UsePaginationReturn extends PaginationState {
  sortBy: string
  sortDir: 'asc' | 'desc'
  search: string
  searchInputValue: string
  setPage: (page: number) => void
  setPerPage: (perPage: number) => void
  setSort: (field: string) => void
  setSearch: (value: string) => void
  updateFromResponse: (data: { total: number; pages: number }) => void
  getApiParams: () => Record<string, string | number>
  handleSearchChange: (value: string) => void
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    defaultPerPage = 20,
    defaultSortBy = 'created_at',
    defaultSortDir = 'desc',
  } = options

  const [page, setPageState] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPageState] = useState(defaultPerPage)
  const [sortBy, setSortBy] = useState(defaultSortBy)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir)
  const [search, setSearchState] = useState('')
  const [searchInputValue, setSearchInputValue] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setPage = useCallback((p: number) => {
    setPageState(p)
  }, [])

  const setPerPage = useCallback((pp: number) => {
    setPerPageState(pp)
    setPageState(1)
  }, [])

  const setSort = useCallback((field: string) => {
    setSortBy((prevSortBy) => {
      if (prevSortBy === field) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortDir('asc')
      }
      return field
    })
    setPageState(1)
  }, [])

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
    setSearchInputValue(value)
    setPageState(1)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchInputValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearchState(value)
      setPageState(1)
    }, 300)
  }, [])

  const updateFromResponse = useCallback((data: { total: number; pages: number }) => {
    setTotal(data.total)
    setTotalPages(data.pages)
  }, [])

  const getApiParams = useCallback(() => {
    const params: Record<string, string | number> = {
      page,
      per_page: perPage,
    }
    if (sortBy) params.sort_by = sortBy
    if (sortDir) params.sort_dir = sortDir
    if (search) params.search = search
    return params
  }, [page, perPage, sortBy, sortDir, search])

  return {
    page, totalPages, total, perPage,
    sortBy, sortDir, search, searchInputValue,
    setPage, setPerPage, setSort, setSearch,
    updateFromResponse, getApiParams, handleSearchChange,
  }
}
