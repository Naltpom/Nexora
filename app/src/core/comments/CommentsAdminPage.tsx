import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import { useConfirm } from '../ConfirmModal'
import { Pagination } from '../../core/pagination'
import './comments.scss'

/* -- Types -- */

interface AdminComment {
  id: number
  user_id: number
  user_email: string
  user_name: string
  resource_type: string
  resource_id: number
  content: string
  parent_id: number | null
  is_edited: boolean
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  status: string
  moderated_by_id: number | null
  moderated_by_email: string | null
  moderated_at: string | null
}

interface AdminListResponse {
  items: AdminComment[]
  total: number
  page: number
  per_page: number
  pages: number
}

/* -- Memoized Row -- */

interface AdminRowProps {
  comment: AdminComment
  onApprove: (id: number) => void
  onReject: (id: number) => void
  onDelete: (id: number) => void
  formatDate: (iso: string) => string
  t: (key: string, opts?: Record<string, unknown>) => string
}

/** Strip HTML tags for plain text preview in admin table. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

const AdminRow = memo(function AdminRow({ comment, onApprove, onReject, onDelete, formatDate, t }: AdminRowProps) {
  const statusBadgeClass = comment.status === 'pending'
    ? 'badge badge-warning'
    : comment.status === 'approved'
      ? 'badge badge-success'
      : 'badge badge-error'

  const statusLabel = comment.status === 'pending'
    ? t('admin_status_pending')
    : comment.status === 'approved'
      ? t('admin_status_approved')
      : t('admin_status_rejected')

  const plainContent = stripHtml(comment.content)

  return (
    <tr>
      <td className="text-gray-500-sm nowrap">{formatDate(comment.created_at)}</td>
      <td>{comment.user_name || comment.user_email}</td>
      <td>
        <span className="resource-badge">
          {comment.resource_type}
          <span className="resource-badge-id">#{comment.resource_id}</span>
        </span>
      </td>
      <td className="comments-admin-content-cell" title={plainContent}>{plainContent}</td>
      <td><span className={statusBadgeClass}>{statusLabel}</span></td>
      <td>
        <div className="comments-admin-actions">
          {comment.status !== 'approved' && (
            <button
              className="comments-admin-btn comments-admin-btn--approve"
              onClick={() => onApprove(comment.id)}
            >
              {t('admin_btn_approuver')}
            </button>
          )}
          {comment.status !== 'rejected' && (
            <button
              className="comments-admin-btn comments-admin-btn--reject"
              onClick={() => onReject(comment.id)}
            >
              {t('admin_btn_rejeter')}
            </button>
          )}
          <button
            className="comments-admin-btn comments-admin-btn--delete"
            onClick={() => onDelete(comment.id)}
          >
            {t('btn_supprimer')}
          </button>
        </div>
      </td>
    </tr>
  )
})

/* -- Component -- */

export default function CommentsAdminPage() {
  const { t } = useTranslation('comments')
  const { confirm } = useConfirm()

  const [comments, setComments] = useState<AdminComment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(25)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (
    p?: number, s?: string, pp?: number, sb?: string, sd?: string, sf?: string,
  ) => {
    const currentPage = p ?? page
    const currentSearch = s ?? search
    const currentPerPage = pp ?? perPage
    const currentSortBy = sb ?? sortBy
    const currentSortDir = sd ?? sortDir
    const currentStatusFilter = sf ?? statusFilter

    try {
      const res = await api.get<AdminListResponse>('/comments/admin/', {
        params: {
          page: currentPage,
          per_page: currentPerPage,
          search: currentSearch,
          sort_by: currentSortBy,
          sort_dir: currentSortDir,
          status_filter: currentStatusFilter,
        },
      })
      setComments(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.pages)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, search, perPage, sortBy, sortDir, statusFilter])

  // Load pending count separately
  const loadPendingCount = useCallback(async () => {
    try {
      const res = await api.get<AdminListResponse>('/comments/admin/', {
        params: { per_page: 1, status_filter: 'pending' },
      })
      setPendingCount(res.data.total)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadData()
    loadPendingCount()
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

  const handleSort = (field: string) => {
    const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortDir(newDir)
    setPage(1)
    loadData(1, undefined, undefined, field, newDir)
  }

  const handleSortKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(field)
    }
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
    loadData(1, undefined, undefined, undefined, undefined, value)
  }

  const handlePerPageChange = (pp: number) => {
    setPerPage(pp)
    setPage(1)
    loadData(1, undefined, pp)
  }

  const handleApprove = useCallback(async (id: number) => {
    try {
      const res = await api.patch<AdminComment>(`/comments/admin/${id}/approve`)
      setComments((prev) => prev.map((c) => (c.id === id ? res.data : c)))
      loadPendingCount()
    } catch {
      // silent
    }
  }, [loadPendingCount])

  const handleReject = useCallback(async (id: number) => {
    try {
      const res = await api.patch<AdminComment>(`/comments/admin/${id}/reject`)
      setComments((prev) => prev.map((c) => (c.id === id ? res.data : c)))
      loadPendingCount()
    } catch {
      // silent
    }
  }, [loadPendingCount])

  const handleDelete = useCallback(async (id: number) => {
    const ok = await confirm({
      title: t('confirm_supprimer_titre'),
      message: t('confirm_supprimer_message'),
      confirmText: t('confirm_supprimer_btn'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/comments/admin/${id}`)
      setComments((prev) => prev.filter((c) => c.id !== id))
      setTotal((prev) => prev - 1)
      loadPendingCount()
    } catch {
      // silent
    }
  }, [confirm, t, loadPendingCount])

  const formatDate = (iso: string) => new Date(iso).toLocaleString()

  const getAriaSort = (field: string): 'ascending' | 'descending' | 'none' => {
    if (sortBy !== field) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <Layout
      breadcrumb={[{ label: t('admin_titre'), path: '/admin/comments' }, { label: t('admin_breadcrumb') }]}
      title={t('admin_titre')}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('admin_titre')}</h1>
            <p>{t('admin_sous_titre')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{total}</span>
              <span className="page-header-stat-label">{t('admin_stat_total')}</span>
            </div>
            <div className="page-header-stat">
              <span className="page-header-stat-value">{pendingCount}</span>
              <span className="page-header-stat-label">{t('admin_stat_pending')}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-busy="true" role="status">
          <span className="sr-only">{t('aria_loading')}</span>
        </div>
      ) : (
        <>
          <div className="unified-card full-width-breakout card-table">
            <div className="comments-admin-toolbar" role="search" aria-label={t('admin_aria_search')}>
              <input
                type="text"
                className="comments-admin-search"
                placeholder={t('admin_rechercher')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label={t('admin_aria_search')}
              />
              <select
                className="comments-admin-filter"
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                aria-label={t('admin_filtre_status')}
              >
                <option value="">{t('admin_filtre_tous')}</option>
                <option value="pending">{t('admin_filtre_pending')}</option>
                <option value="approved">{t('admin_filtre_approved')}</option>
                <option value="rejected">{t('admin_filtre_rejected')}</option>
              </select>
            </div>

            {comments.length === 0 ? (
              <div className="table-no-match" role="status">{t('admin_aucun')}</div>
            ) : (
              <div className="table-container">
                <table className="unified-table" aria-label={t('admin_aria_table')}>
                  <caption className="sr-only">{t('admin_aria_table')}</caption>
                  <thead>
                    <tr>
                      <th
                        className="th-sortable"
                        onClick={() => handleSort('created_at')}
                        onKeyDown={(e) => handleSortKeyDown(e, 'created_at')}
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={getAriaSort('created_at')}
                        scope="col"
                      >
                        {t('admin_col_date')} {sortBy === 'created_at' && <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                      </th>
                      <th scope="col">{t('admin_col_auteur')}</th>
                      <th scope="col">{t('admin_col_resource')}</th>
                      <th scope="col">{t('admin_col_contenu')}</th>
                      <th
                        className="th-sortable"
                        onClick={() => handleSort('status')}
                        onKeyDown={(e) => handleSortKeyDown(e, 'status')}
                        role="columnheader"
                        tabIndex={0}
                        aria-sort={getAriaSort('status')}
                        scope="col"
                      >
                        {t('admin_col_status')} {sortBy === 'status' && <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                      </th>
                      <th scope="col">{t('admin_col_actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comments.map((comment) => (
                      <AdminRow
                        key={comment.id}
                        comment={comment}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onDelete={handleDelete}
                        formatDate={formatDate}
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
            countDisplay={`${total} ${t('stat_commentaires_plural')}`}
            onPageChange={goToPage}
            onPerPageChange={handlePerPageChange}
          />
        </>
      )}
    </Layout>
  )
}
