import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import { useConfirm } from '../ConfirmModal'
import { Pagination } from '../../core/pagination'
import FilePreview from './FilePreview'
import { formatSize } from './utils'
import type { StorageDocument } from './types'
import './file_storage.scss'

/* -- Types -- */

interface AdminListResponse {
  items: StorageDocument[]
  total: number
  page: number
  per_page: number
  pages: number
}

interface AdminStats {
  total_files: number
  total_size_bytes: number
  pending_moderation: number
}

/* -- Helpers -- */

function getScanBadgeClass(status: string): string {
  switch (status) {
    case 'clean': return 'badge badge-success'
    case 'infected': return 'badge badge-error'
    case 'pending': return 'badge badge-warning'
    case 'error': return 'badge badge-error'
    default: return 'badge'
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'approved': return 'badge badge-success'
    case 'pending': return 'badge badge-warning'
    case 'rejected': return 'badge badge-error'
    default: return 'badge'
  }
}

/* -- Memoized Row -- */

interface AdminRowProps {
  file: StorageDocument
  onDelete: (uuid: string) => void
  onApprove: (uuid: string) => void
  onReject: (uuid: string) => void
  onDownload: (uuid: string, filename: string) => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

const AdminRow = memo(function AdminRow({ file, onDelete, onApprove, onReject, onDownload, t }: AdminRowProps) {
  return (
    <tr>
      <td className="fs-admin-preview-cell">
        <FilePreview file={file} size="sm" />
      </td>
      <td title={file.original_filename}>{file.original_filename}</td>
      <td>{file.mime_type}</td>
      <td>{formatSize(file.size_bytes, t)}</td>
      <td>{file.uploader_name || `#${file.uploaded_by}`}</td>
      <td className="text-gray-500-sm nowrap">{new Date(file.created_at).toLocaleString()}</td>
      <td>
        <span className={getStatusBadgeClass(file.status)}>
          {t(`moderation_${file.status}`)}
        </span>
      </td>
      <td>
        <span className={getScanBadgeClass(file.scan_status)}>
          {t(`scan_${file.scan_status}`)}
        </span>
      </td>
      <td>
        <div className="fs-admin-actions">
          {file.status !== 'approved' && (
            <button
              type="button"
              className="fs-file-action-btn fs-file-action-btn--approve"
              onClick={() => onApprove(file.uuid)}
              aria-label={t('btn_approve')}
              title={t('btn_approve')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          )}
          {file.status !== 'rejected' && (
            <button
              type="button"
              className="fs-file-action-btn fs-file-action-btn--reject"
              onClick={() => onReject(file.uuid)}
              aria-label={t('btn_reject')}
              title={t('btn_reject')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="fs-file-action-btn"
            onClick={() => onDownload(file.uuid, file.original_filename)}
            aria-label={t('aria_download_file', { name: file.original_filename })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button
            type="button"
            className="fs-file-action-btn fs-file-action-btn--danger"
            onClick={() => onDelete(file.uuid)}
            aria-label={t('aria_delete_file', { name: file.original_filename })}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" /><path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  )
})

/* -- Component -- */

export default function FileStorageAdminPage() {
  const { t } = useTranslation('file_storage')
  const { confirm } = useConfirm()

  const [files, setFiles] = useState<StorageDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(25)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [stats, setStats] = useState<AdminStats>({ total_files: 0, total_size_bytes: 0, pending_moderation: 0 })
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (
    p?: number, s?: string, pp?: number, f?: string,
  ) => {
    const currentPage = p ?? page
    const currentSearch = s ?? search
    const currentPerPage = pp ?? perPage
    const currentFilter = f ?? filter

    try {
      const res = await api.get<AdminListResponse>('/file-storage/admin/files', {
        params: {
          page: currentPage,
          per_page: currentPerPage,
          search: currentSearch || undefined,
          filter: currentFilter || undefined,
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
  }, [page, search, perPage, filter])

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<AdminStats>('/file-storage/admin/stats')
      setStats(res.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadData()
    loadStats()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (p: number) => {
    setPage(p)
    loadData(p)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      loadData(1, value)
    }, 300)
  }

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setPage(1)
    loadData(1, undefined, undefined, value)
  }

  const handlePerPageChange = (pp: number) => {
    setPerPage(pp)
    setPage(1)
    loadData(1, undefined, pp)
  }

  const handleDelete = useCallback(async (uuid: string) => {
    const ok = await confirm({
      title: t('confirm_delete_title'),
      message: t('confirm_delete_message'),
      confirmText: t('confirm_delete_btn'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/file-storage/admin/files/${uuid}`)
      setFiles((prev) => prev.filter((f) => f.uuid !== uuid))
      setTotal((prev) => prev - 1)
      loadStats()
    } catch {
      // silent
    }
  }, [confirm, t, loadStats])

  const handleApprove = useCallback(async (uuid: string) => {
    try {
      await api.patch(`/file-storage/admin/files/${uuid}/approve`)
      setFiles((prev) => prev.map((f) => (f.uuid === uuid ? { ...f, status: 'approved' as const } : f)))
      loadStats()
    } catch {
      // silent
    }
  }, [loadStats])

  const handleReject = useCallback(async (uuid: string) => {
    try {
      await api.patch(`/file-storage/admin/files/${uuid}/reject`)
      setFiles((prev) => prev.map((f) => (f.uuid === uuid ? { ...f, status: 'rejected' as const } : f)))
      loadStats()
    } catch {
      // silent
    }
  }, [loadStats])

  const handleDownload = useCallback(async (uuid: string, filename: string) => {
    try {
      const res = await api.get(`/file-storage/files/${uuid}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // silent
    }
  }, [])

  const filterTabs = [
    { value: '', label: t('admin_filter_all') },
    { value: 'images', label: t('admin_filter_images') },
    { value: 'documents', label: t('admin_filter_documents') },
    { value: 'other', label: t('admin_filter_other') },
  ]

  return (
    <Layout
      breadcrumb={[{ label: t('admin_title'), path: '/admin/files' }, { label: t('admin_breadcrumb') }]}
      title={t('admin_title')}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('admin_title')}</h1>
            <p>{t('admin_subtitle')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{stats.total_files}</span>
              <span className="page-header-stat-label">{t('admin_stat_total')}</span>
            </div>
            <div className="page-header-stat">
              <span className="page-header-stat-value">{formatSize(stats.total_size_bytes, t)}</span>
              <span className="page-header-stat-label">{t('admin_stat_size')}</span>
            </div>
            {stats.pending_moderation > 0 && (
              <div className="page-header-stat">
                <span className="page-header-stat-value fs-stat-pending">{stats.pending_moderation}</span>
                <span className="page-header-stat-label">{t('admin_stat_pending')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-busy="true" role="status">
          <span className="sr-only">{t('status_pending')}</span>
        </div>
      ) : (
        <>
          <div className="unified-card full-width-breakout card-table">
            <div className="fs-admin-toolbar" role="search" aria-label={t('admin_search')}>
              <input
                type="text"
                className="fs-admin-search"
                placeholder={t('admin_search')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label={t('admin_search')}
              />
              <div className="fs-admin-filters" role="tablist">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    className={`fs-admin-filter-tab${filter === tab.value ? ' fs-admin-filter-tab--active' : ''}`}
                    onClick={() => handleFilterChange(tab.value)}
                    aria-selected={filter === tab.value}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {files.length === 0 ? (
              <div className="table-no-match" role="status">{t('admin_no_files')}</div>
            ) : (
              <div className="table-container">
                <table className="unified-table" aria-label={t('admin_title')}>
                  <caption className="sr-only">{t('admin_title')}</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="fs-admin-th-preview">{t('btn_preview')}</th>
                      <th scope="col">{t('list_col_name')}</th>
                      <th scope="col">{t('list_col_type')}</th>
                      <th scope="col">{t('list_col_size')}</th>
                      <th scope="col">{t('list_col_owner')}</th>
                      <th scope="col">{t('list_col_date')}</th>
                      <th scope="col">{t('list_col_status')}</th>
                      <th scope="col">{t('list_col_scan')}</th>
                      <th scope="col">{t('list_col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <AdminRow
                        key={file.uuid}
                        file={file}
                        onDelete={handleDelete}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onDownload={handleDownload}
                        t={t}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            countDisplay={`${total} ${t('admin_stat_total').toLowerCase()}`}
            onPageChange={goToPage}
            onPerPageChange={handlePerPageChange}
          />
        </>
      )}
    </Layout>
  )
}
