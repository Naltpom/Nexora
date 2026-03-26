import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useConfirm } from '../ConfirmModal'

interface HistoryEntry {
  id: number
  uuid: string
  export_id: string
  export_label: string
  feature_name: string
  format: string
  params_json: string | null
  params_display: string | null
  oc_id: number | null
  oc_name: string | null
  file_size_bytes: number | null
  status: string
  storage_document_uuid: string | null
  user_name: string | null
  created_at: string
}

interface ExportHistoryProps {
  exportId?: string
  refreshKey: number
  highlightedUuid?: string | null
}

export default function ExportHistory({ exportId, refreshKey, highlightedUuid }: ExportHistoryProps) {
  const { t } = useTranslation('exports')
  const { confirm } = useConfirm()
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const loadHistory = useCallback(async (p?: number) => {
    try {
      const params: Record<string, any> = { page: p ?? page, per_page: 10 }
      if (exportId) {
        params.export_id = exportId
      }
      const res = await api.get('/exports/history', { params })
      setItems(res.data.items || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, exportId])

  useEffect(() => { loadHistory() }, [loadHistory, refreshKey])

  const handleDelete = async (entry: HistoryEntry) => {
    const ok = await confirm({
      message: t('history_confirm_delete'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/exports/history/${entry.uuid}`)
      loadHistory()
    } catch {
      // ignore
    }
  }

  const handleDownload = (docUuid: string, filename: string) => {
    api.get(`/file-storage/files/${docUuid}/download`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    })
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '\u2014'
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderParamBadges = (entry: HistoryEntry) => {
    const json = entry.params_display || entry.params_json
    if (!json) return '\u2014'
    try {
      const obj = JSON.parse(json)
      const entries = Object.entries(obj)
      if (entries.length === 0) return '\u2014'
      return (
        <div className="export-history-badges">
          {entries.map(([label, value]) => (
            <span key={label} className="export-history-badge">
              <span className="export-history-badge-label">{label}</span>
              <span className="export-history-badge-value">{Array.isArray(value) ? (value as any[]).join(', ') : String(value)}</span>
            </span>
          ))}
        </div>
      )
    } catch {
      return '\u2014'
    }
  }

  const goToPage = (p: number) => {
    setPage(p)
    loadHistory(p)
  }

  if (loading && items.length === 0) return null
  if (total === 0) return null

  return (
    <div className="exports-history">
      <h2 className="exports-section-title">{t('history_title')}</h2>

      <div className="unified-card">
        <table className="unified-table">
          <thead>
            <tr>
              <th>{t('history_col_date')}</th>
              {!exportId && <th>{t('history_col_export')}</th>}
              <th>{t('history_col_params')}</th>
              <th>{t('history_col_format')}</th>
              <th>{t('history_col_size')}</th>
              <th>{t('history_col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(entry => (
              <tr
                key={entry.uuid}
                className={highlightedUuid === entry.uuid ? 'modal-row--highlighted' : ''}
              >
                <td className="cell-nowrap">{formatDate(entry.created_at)}</td>
                {!exportId && (
                  <td>
                    <div>{entry.export_label}</div>
                    {entry.oc_name && (
                      <span className="export-history-oc">{entry.oc_name}</span>
                    )}
                  </td>
                )}
                <td className="export-history-params">{renderParamBadges(entry)}</td>
                <td>
                  <span className={`export-card-badge export-card-badge--${entry.format}`}>
                    {t(`format_${entry.format}`)}
                  </span>
                </td>
                <td className="cell-nowrap">{formatSize(entry.file_size_bytes)}</td>
                <td className="cell-nowrap">
                  <div className="export-history-actions">
                    {entry.storage_document_uuid && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleDownload(
                          entry.storage_document_uuid!,
                          `${entry.export_label}.${entry.format === 'excel' ? 'xlsx' : entry.format}`,
                        )}
                      >
                        {t('history_btn_download')}
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleDelete(entry)}
                    >
                      {t('history_btn_delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="unified-pagination">
            <div className="unified-pagination-info">
              {t('history_total', { count: total })}
            </div>
            <div className="unified-pagination-controls">
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                &#8249;
              </button>
              <span className="unified-pagination-current">{page} / {pages}</span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= pages}
                onClick={() => goToPage(page + 1)}
              >
                &#8250;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
