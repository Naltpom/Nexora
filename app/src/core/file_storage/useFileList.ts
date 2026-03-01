import { useState, useEffect, useCallback } from 'react'
import api from '../../api'
import type { StorageDocument, QuotaInfo } from './types'
import type { PaginatedResponse } from '../../types'

interface UseFileListOptions {
  resourceType: string
  resourceId?: number | null
  initialPerPage?: number
}

export function useFileList({ resourceType, resourceId, initialPerPage = 25 }: UseFileListOptions) {
  const [files, setFiles] = useState<StorageDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(initialPerPage)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [quota, setQuota] = useState<QuotaInfo | null>(null)

  const fetchFiles = useCallback(async (p?: number, pp?: number) => {
    const currentPage = p ?? page
    const currentPerPage = pp ?? perPage

    try {
      const res = await api.get<PaginatedResponse<StorageDocument>>('/file-storage/files', {
        params: {
          resource_type: resourceType,
          resource_id: resourceId ?? undefined,
          page: currentPage,
          per_page: currentPerPage,
        },
      })
      setFiles(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.pages)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [resourceType, resourceId, page, perPage])

  const fetchQuota = useCallback(async () => {
    try {
      const res = await api.get<QuotaInfo>('/file-storage/quota')
      setQuota(res.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchFiles()
    fetchQuota()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteFile = useCallback(async (uuid: string) => {
    try {
      await api.delete(`/file-storage/files/${uuid}`)
      setFiles((prev) => prev.filter((f) => f.uuid !== uuid))
      setTotal((prev) => prev - 1)
      fetchQuota()
    } catch {
      // silent
    }
  }, [fetchQuota])

  const downloadFile = useCallback((doc: StorageDocument) => {
    window.open(`/api/file-storage/files/${doc.uuid}/download`, '_blank')
  }, [])

  const addFile = useCallback((doc: StorageDocument) => {
    setFiles((prev) => [doc, ...prev])
    setTotal((prev) => prev + 1)
    fetchQuota()
  }, [fetchQuota])

  const removeFile = useCallback((uuid: string) => {
    setFiles((prev) => prev.filter((f) => f.uuid !== uuid))
    setTotal((prev) => prev - 1)
  }, [])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchFiles()
    fetchQuota()
  }, [fetchFiles, fetchQuota])

  const handlePageChange = useCallback((p: number) => {
    setPage(p)
    fetchFiles(p)
  }, [fetchFiles])

  const handlePerPageChange = useCallback((pp: number) => {
    setPerPage(pp)
    setPage(1)
    fetchFiles(1, pp)
  }, [fetchFiles])

  return {
    files,
    loading,
    page,
    perPage,
    total,
    totalPages,
    quota,
    deleteFile,
    downloadFile,
    addFile,
    removeFile,
    refresh,
    setPage: handlePageChange,
    setPerPage: handlePerPageChange,
  }
}
