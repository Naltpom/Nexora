import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
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
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [detailModal, setDetailModal] = useState<CommandExecution | null>(null)

  const perPage = 20

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
    if (exec.status === 'error') return exec.error_message || 'Erreur'
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
        { label: 'Accueil', path: '/' },
        { label: 'Commandes', path: '/admin/commands' },
        { label: 'Historique' },
      ]}
      title="Historique des commandes"
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Historique des commandes</h1>
            <p>Consultez l'historique d'execution des commandes de maintenance</p>
          </div>
          <div className="unified-page-header-actions">
            <Link to="/admin/commands" className="btn btn-secondary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Commandes
            </Link>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="spinner" />
      ) : (
        <div className="unified-card full-width-breakout">
          {/* Filters */}
          <div className="section-header">
            <input
              type="text"
              placeholder="Filtrer par nom de commande..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-search-wide"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="input-select"
            >
              <option value="">Tous les statuts</option>
              <option value="success">Succes</option>
              <option value="error">Erreur</option>
            </select>
          </div>

          <div className="table-container">
            <table className="unified-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Commande</th>
                  <th>Feature</th>
                  <th>Statut</th>
                  <th>Duree</th>
                  <th>Source</th>
                  <th>Executee par</th>
                  <th>Resultat</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-state-sm">
                      Aucune execution trouvee
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
                          {exec.status === 'success' ? 'Succes' : 'Erreur'}
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
                          title="Voir le detail"
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
            <div className="pagination">
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Precedent
              </button>
              <span className="pagination-info">
                Page {data.page} / {data.pages} ({data.total} resultats)
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= data.pages}
                onClick={() => setPage(p => p + 1)}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{detailModal.command_label}</h2>
              <button className="modal-close" onClick={() => setDetailModal(null)}>&times;</button>
            </div>
            <div className="modal-body modal-body-scroll">
              <div className="flex-col-sm">
                <div className="detail-item">
                  <div className="detail-item-label">Commande</div>
                  <code className="text-gray-500-code">{detailModal.command_name}</code>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Statut</div>
                  <span className={`badge ${detailModal.status === 'success' ? 'badge-success' : 'badge-error'} text-xs`}>
                    {detailModal.status === 'success' ? 'Succes' : 'Erreur'}
                  </span>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Date</div>
                  <span>{formatDate(detailModal.executed_at)}</span>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Duree</div>
                  <span>{detailModal.duration_seconds}s</span>
                </div>
                <div className="detail-item">
                  <div className="detail-item-label">Source</div>
                  <span className="badge badge-secondary text-xs">{sourceLabel(detailModal.source)}</span>
                </div>
                {detailModal.executed_by_name && (
                  <div className="detail-item">
                    <div className="detail-item-label">Executee par</div>
                    <span>{detailModal.executed_by_name}</span>
                  </div>
                )}
                {detailModal.error_message && (
                  <div className="detail-item">
                    <div className="detail-item-label">Erreur</div>
                    <pre className="command-result-pre">{detailModal.error_message}</pre>
                  </div>
                )}
                {detailModal.result && (
                  <div className="detail-item">
                    <div className="detail-item-label">Resultat</div>
                    <pre className="command-result-pre">{JSON.stringify(detailModal.result, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
