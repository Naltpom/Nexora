import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import './_identity.scss'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface CommandExecution {
  id: number
  command_name: string
  command_label: string
  feature: string
  status: string
  result: Record<string, any> | null
  error_message: string | null
  duration_seconds: number
  source: string
  executed_by: number | null
  executed_by_name: string | null
  executed_at: string
}

interface PaginatedResponse {
  items: CommandExecution[]
  total: number
  page: number
  per_page: number
  pages: number
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function CommandHistoryPage() {
  const { t } = useTranslation('_identity')
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [detailModal, setDetailModal] = useState<CommandExecution | null>(null)
  const detailModalRef = useRef<HTMLDivElement>(null)
  const detailModalTitleId = 'command-detail-modal-title'

  const perPage = 20

  // Escape key handler for detail modal
  useEffect(() => {
    if (!detailModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailModal(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    detailModalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [detailModal])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page, per_page: perPage }
      if (search) params.command_name = search
      if (statusFilter) params.status = statusFilter
      const res = await api.get('/commands/history', { params })
      setData(res.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  const formatResult = (exec: CommandExecution) => {
    if (exec.status === 'error') return exec.error_message || t('common.error')
    if (!exec.result) return 'OK'
    if (exec.result.message) return exec.result.message as string
    return Object.entries(exec.result).map(([k, v]) => `${k}: ${v}`).join(', ')
  }

  const sourceLabel = (s: string) => {
    switch (s) {
      case 'api': return 'API'
      case 'cli': return 'CLI'
      case 'cron': return 'Cron'
      default: return s
    }
  }

  const items = data?.items || []

  return (
    <Layout
      breadcrumb={[
        { label: t('common.home'), path: '/' },
        { label: t('command_history.breadcrumb_commands'), path: '/admin/commands' },
        { label: t('command_history.breadcrumb_history') },
      ]}
      title={t('command_history.page_title')}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('command_history.page_title')}</h1>
            <p>{t('command_history.subtitle')}</p>
          </div>
          <div className="unified-page-header-actions">
            <Link to="/admin/commands" className="btn btn-secondary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              {t('command_history.btn_commands')}
            </Link>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="spinner" role="status" aria-busy="true">
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : (
        <div className="unified-card full-width-breakout">
          {/* Filters */}
          <div className="section-header" role="search">
            <input
              type="text"
              placeholder={t('command_history.filter_placeholder')}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-search-wide"
              aria-label={t('command_history.filter_placeholder')}
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="input-select"
              aria-label={t('a11y.filter_status')}
            >
              <option value="">{t('command_history.filter_all_statuses')}</option>
              <option value="success">{t('command_history.filter_success')}</option>
              <option value="error">{t('command_history.filter_error')}</option>
            </select>
          </div>

          <div className="table-container">
            <table className="unified-table" aria-busy={loading}>
              <caption className="sr-only">{t('a11y.table_caption_command_history')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('command_history.th_date')}</th>
                  <th scope="col">{t('command_history.th_command')}</th>
                  <th scope="col">{t('command_history.th_feature')}</th>
                  <th scope="col">{t('command_history.th_status')}</th>
                  <th scope="col">{t('command_history.th_duration')}</th>
                  <th scope="col">{t('command_history.th_source')}</th>
                  <th scope="col">{t('command_history.th_executed_by')}</th>
                  <th scope="col">{t('command_history.th_result')}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-state-sm">
                      {t('command_history.empty_state')}
                    </td>
                  </tr>
                ) : (
                  items.map(exec => (
                    <tr key={exec.id} className={exec.status === 'error' ? 'row-error' : ''}>
                      <td className="text-gray-500-sm nowrap">
                        {formatDate(exec.executed_at)}
                      </td>
                      <td>
                        <div>
                          <div className="font-medium">{exec.command_label}</div>
                          <code className="text-gray-400-code">{exec.command_name}</code>
                        </div>
                      </td>
                      <td className="text-gray-500-sm nowrap">
                        {exec.feature}
                      </td>
                      <td>
                        <span className={`badge ${exec.status === 'success' ? 'badge-success' : 'badge-error'} text-xs`}>
                          {exec.status === 'success' ? t('command_history.status_success') : t('command_history.status_error')}
                        </span>
                      </td>
                      <td className="text-gray-500-sm nowrap">
                        {exec.duration_seconds}s
                      </td>
                      <td>
                        <span className="badge badge-secondary text-xs">
                          {sourceLabel(exec.source)}
                        </span>
                      </td>
                      <td className="text-gray-500-sm">
                        {exec.executed_by_name || '\u2014'}
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => setDetailModal(exec)}
                          aria-label={t('command_history.btn_view_detail')}
                        >
                          {formatResult(exec).length > 40
                            ? formatResult(exec).substring(0, 40) + '...'
                            : formatResult(exec)}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <nav className="pagination" aria-label={t('a11y.pagination')}>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                aria-label={t('common.previous')}
              >
                {t('common.previous')}
              </button>
              <span className="pagination-info" aria-live="polite" aria-atomic="true">
                {t('command_history.pagination_page', { current: data.page, total: data.pages, count: data.total })}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= data.pages}
                onClick={() => setPage(p => p + 1)}
                aria-label={t('common.next')}
              >
                {t('common.next')}
              </button>
            </nav>
          )}
        </div>
      )}

      {/* Detail modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div
            className="modal modal-narrow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailModalTitleId}
            ref={detailModalRef}
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 id={detailModalTitleId}>{detailModal.command_label}</h2>
              <button className="modal-close" onClick={() => setDetailModal(null)} aria-label={t('common.close')}>&times;</button>
            </div>
            <div className="modal-body modal-body-scroll">
              <div className="flex-col-sm">
                <div className="detail-item">
                  <div className="detail-item-label">{t('command_history.detail_title_command')}</div>
                  <code className="text-gray-500-code">{detailModal.command_name}</code>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('command_history.detail_title_status')}</div>
                  <span className={`badge ${detailModal.status === 'success' ? 'badge-success' : 'badge-error'} text-xs`}>
                    {detailModal.status === 'success' ? t('command_history.status_success') : t('command_history.status_error')}
                  </span>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('command_history.detail_title_date')}</div>
                  <span>{formatDate(detailModal.executed_at)}</span>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('command_history.detail_title_duration')}</div>
                  <span>{detailModal.duration_seconds}s</span>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">{t('command_history.detail_title_source')}</div>
                  <span className="badge badge-secondary text-xs">{sourceLabel(detailModal.source)}</span>
                </div>
                {detailModal.executed_by_name && (
                  <div className="detail-item">
                    <div className="detail-item-label">{t('command_history.detail_title_executed_by')}</div>
                    <span>{detailModal.executed_by_name}</span>
                  </div>
                )}
                {detailModal.error_message && (
                  <div className="detail-item">
                    <div className="detail-item-label">{t('command_history.detail_title_error')}</div>
                    <pre className="command-result-pre">{detailModal.error_message}</pre>
                  </div>
                )}
                {detailModal.result && (
                  <div className="detail-item">
                    <div className="detail-item-label">{t('command_history.detail_title_result')}</div>
                    <pre className="command-result-pre">{JSON.stringify(detailModal.result, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
