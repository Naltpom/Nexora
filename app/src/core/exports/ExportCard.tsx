import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import { useConfirm } from '../ConfirmModal'
import MultiSelect from '../MultiSelect'
import type { AvailableExport } from './types'

interface ExportCardProps {
  descriptor: AvailableExport
  selectedOcId?: number
  selectedOcUuid?: string
  selectedOcName?: string
  autoOpenEntryUuid?: string
  onModalClose?: () => void
}

interface SelectOption {
  value: string | number
  label: string
}

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
  error_detail: string | null
  storage_document_uuid: string | null
  user_name: string | null
  created_at: string
}

export default function ExportCard({
  descriptor,
  selectedOcId,
  selectedOcUuid,
  selectedOcName,
  autoOpenEntryUuid,
  onModalClose,
}: ExportCardProps) {
  const { t } = useTranslation('exports')
  const { t: tFeature } = useTranslation(descriptor.featureName)
  const { confirm } = useConfirm()

  const [modalOpen, setModalOpen] = useState(false)
  const [paramValues, setParamValues] = useState<Record<string, any>>({})
  const [selectOptions, setSelectOptions] = useState<Record<string, SelectOption[]>>({})
  const [generating, setGenerating] = useState(false)
  const [readyDocUuid, setReadyDocUuid] = useState<string | null>(null)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPages, setHistoryPages] = useState(1)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [highlightedEntryUuid, setHighlightedEntryUuid] = useState<string | null>(null)

  const exportLabel = tFeature(descriptor.labelKey.split(':')[1] || descriptor.labelKey)
  const exportDesc = tFeature(descriptor.descriptionKey.split(':')[1] || descriptor.descriptionKey)
  const formatLabel = t(`format_${descriptor.format}`)

  // Auto-open modal when autoOpenEntryUuid matches this export
  useEffect(() => {
    if (autoOpenEntryUuid) {
      setHighlightedEntryUuid(autoOpenEntryUuid)
      setModalOpen(true)
    }
  }, [autoOpenEntryUuid])

  // Load dynamic select options when modal opens
  useEffect(() => {
    if (!modalOpen || !descriptor.params) return

    for (const param of descriptor.params) {
      if ((param.type !== 'api_select' && param.type !== 'api_multi_select') || !param.endpoint) continue

      const params: Record<string, any> = { page: 1, per_page: 200 }
      if (param.filterByScope && param.scopeFilterParam && selectedOcUuid) {
        params[param.scopeFilterParam] = selectedOcUuid
      }

      api.get(param.endpoint, { params }).then(res => {
        const items = res.data.items || res.data || []
        const options: SelectOption[] = items.map((item: any) => ({
          value: item[param.valueField || 'id'],
          label: item[param.labelField || 'name'],
        }))
        setSelectOptions(prev => ({ ...prev, [param.key]: options }))
      })
    }
  }, [modalOpen, descriptor.params, selectedOcUuid])

  // Reset when OC changes
  useEffect(() => {
    setSelectOptions({})
    setParamValues({})
  }, [selectedOcId])

  // Load history for this export
  const loadHistory = useCallback(async (p?: number) => {
    setHistoryLoading(true)
    try {
      const res = await api.get('/exports/history', {
        params: { page: p ?? historyPage, per_page: 5, export_id: descriptor.id },
      })
      setHistoryItems(res.data.items || [])
      setHistoryTotal(res.data.total || 0)
      setHistoryPages(res.data.pages || 1)
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }, [historyPage, descriptor.id])

  useEffect(() => {
    if (modalOpen) {
      loadHistory()
    }
  }, [modalOpen, loadHistory])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const canGenerate = () => {
    if (!descriptor.params) return true
    for (const param of descriptor.params) {
      if (!param.required) continue
      const val = paramValues[param.key]
      if (param.type === 'api_multi_select') {
        if (!val || !Array.isArray(val) || val.length === 0) return false
      } else {
        if (!val) return false
      }
    }
    return true
  }

  const buildParamsPayload = () => {
    const payload: Record<string, any> = {}
    for (const param of descriptor.params || []) {
      const val = paramValues[param.key]
      if (val !== undefined && val !== '' && val !== null) {
        payload[param.key] = val
      }
      // Include date range sub-keys
      if (param.type === 'date_range') {
        const from = paramValues[`${param.key}_from`]
        const to = paramValues[`${param.key}_to`]
        if (from) payload[`${param.key}_from`] = from
        if (to) payload[`${param.key}_to`] = to
      }
    }
    return payload
  }

  const buildParamsDisplay = (_payload: Record<string, any>) => {
    const display: Record<string, string> = {}
    for (const param of descriptor.params || []) {
      const val = paramValues[param.key]
      if (val === undefined || val === '' || val === null) continue
      const label = tFeature(param.labelKey.split(':')[1] || param.labelKey)
      if (param.type === 'api_select') {
        const opt = (selectOptions[param.key] || []).find(o => String(o.value) === String(val))
        display[label] = opt?.label || String(val)
      } else if (param.type === 'api_multi_select') {
        const vals = val as string[]
        const labels = vals.map(v => {
          const opt = (selectOptions[param.key] || []).find(o => String(o.value) === String(v))
          return opt?.label || v
        })
        display[label] = labels.join(', ')
      } else if (param.type === 'multi_year') {
        display[label] = (val as number[]).join(', ')
      } else if (param.type === 'date_range') {
        const from = paramValues[`${param.key}_from`] || ''
        const to = paramValues[`${param.key}_to`] || ''
        if (from || to) display[label] = [from, to].filter(Boolean).join(' → ')
      }
    }
    return display
  }

  const handleGenerate = async () => {
    if (!canGenerate()) return

    setGenerating(true)
    setError('')
    setReadyDocUuid(null)

    try {
      const payload = buildParamsPayload()
      const paramsDisplay = buildParamsDisplay(payload)

      const body = {
        export_id: descriptor.id,
        export_label: exportLabel,
        feature_name: descriptor.featureName,
        format: descriptor.format,
        params_json: Object.keys(payload).length > 0 ? JSON.stringify(payload) : null,
        params_display: Object.keys(paramsDisplay).length > 0 ? JSON.stringify(paramsDisplay) : null,
        oc_id: selectedOcId || null,
        oc_name: selectedOcName || null,
        permission: descriptor.permission,
      }

      const res = await api.post('/exports/generate', body)
      const entryUuid = res.data.uuid

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`/exports/status/${entryUuid}`)
          const st = statusRes.data

          if (st.status === 'success') {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            setGenerating(false)
            setReadyDocUuid(st.storage_document_uuid)
            loadHistory()
          } else if (st.status === 'error') {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            setGenerating(false)
            setError(st.error_detail || t('download_error'))
            loadHistory()
          }
          // If 'pending', keep polling
        } catch {
          // Polling error, keep trying
        }
      }, 2000)
    } catch (err: any) {
      const detail = err.response?.data?.detail || t('download_error')
      setError(detail)
      setGenerating(false)
    }
  }

  const handleDownload = (docUuid: string, fallbackFilename?: string) => {
    api.get(`/file-storage/files/${docUuid}/download`, { responseType: 'blob' }).then(res => {
      // Extract real filename from Content-Disposition header
      let filename = fallbackFilename || 'export'
      const disposition = res.headers['content-disposition']
      if (disposition) {
        const match = disposition.match(/filename="?([^";\n]+)"?/)
        if (match?.[1]) filename = match[1]
      }

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

  const handleDeleteHistory = async (entry: HistoryEntry) => {
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

  const closeModal = () => {
    setModalOpen(false)
    setError('')
    setReadyDocUuid(null)
    setHighlightedEntryUuid(null)
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setGenerating(false)
    onModalClose?.()
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

  const goToHistoryPage = (p: number) => {
    setHistoryPage(p)
    loadHistory(p)
  }

  const currentYear = new Date().getFullYear()

  return (
    <>
      {/* Compact card */}
      <div className="export-card" onClick={() => setModalOpen(true)}>
        <div className="export-card-header">
          <div className="export-card-icon">
            <i data-lucide={descriptor.icon} />
          </div>
          <div className="export-card-info">
            <h3 className="export-card-title">{exportLabel}</h3>
            <p className="export-card-desc">{exportDesc}</p>
          </div>
          <span className={`export-card-badge export-card-badge--${descriptor.format}`}>
            {formatLabel}
          </span>
        </div>
      </div>

      {/* Modal — rendered at body level via portal to escape grid context */}
      {modalOpen && createPortal(
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal--xl" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{exportLabel}</h2>
              <button className="modal-close" onClick={closeModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              {/* Params form */}
              {descriptor.params && descriptor.params.length > 0 && (
                <div className="export-modal-params">
                  {descriptor.params.map(param => (
                    <div key={param.key} className="export-modal-field">
                      <label className="export-modal-label">
                        {tFeature(param.labelKey.split(':')[1] || param.labelKey)}
                        {param.required && <span className="export-modal-required">*</span>}
                      </label>

                      {param.type === 'api_select' && (
                        <select
                          className="list-filter-select"
                          value={paramValues[param.key] ?? ''}
                          onChange={e => setParamValues(prev => ({ ...prev, [param.key]: e.target.value || '' }))}
                        >
                          {[
                            <option key="__empty__" value="">--</option>,
                            ...(selectOptions[param.key] || []).map((opt, i) => (
                              <option key={`${i}-${opt.value}`} value={opt.value}>{opt.label}</option>
                            )),
                          ]}
                        </select>
                      )}

                      {param.type === 'api_multi_select' && (
                        <MultiSelect
                          options={(selectOptions[param.key] || []).map(o => ({
                            value: String(o.value),
                            label: String(o.label),
                          }))}
                          values={paramValues[param.key] || []}
                          onChange={selected => setParamValues(prev => ({ ...prev, [param.key]: selected }))}
                          placeholder={tFeature(param.labelKey.split(':')[1] || param.labelKey)}
                        />
                      )}

                      {param.type === 'multi_year' && (
                        <div className="export-modal-years">
                          {Array.from(
                            { length: (param.yearRange?.[1] || currentYear) - (param.yearRange?.[0] || currentYear - 5) + 1 },
                            (_, i) => (param.yearRange?.[0] || currentYear - 5) + i,
                          ).map(year => (
                            <label key={year} className="export-modal-year">
                              <input
                                type="checkbox"
                                checked={(paramValues[param.key] || []).includes(year)}
                                onChange={e => {
                                  const current: number[] = paramValues[param.key] || []
                                  const next = e.target.checked
                                    ? [...current, year].sort()
                                    : current.filter((y: number) => y !== year)
                                  setParamValues(prev => ({ ...prev, [param.key]: next }))
                                }}
                              />
                              {year}
                            </label>
                          ))}
                        </div>
                      )}

                      {param.type === 'date_range' && (
                        <div className="export-modal-dates">
                          <input
                            type="date"
                            className="list-search-input"
                            placeholder={t('param_date_from')}
                            value={paramValues[`${param.key}_from`] || ''}
                            onChange={e => setParamValues(prev => ({ ...prev, [`${param.key}_from`]: e.target.value }))}
                          />
                          <input
                            type="date"
                            className="list-search-input"
                            placeholder={t('param_date_to')}
                            value={paramValues[`${param.key}_to`] || ''}
                            onChange={e => setParamValues(prev => ({ ...prev, [`${param.key}_to`]: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Generate button + status area */}
              <div className="modal-section export-actions">
                {!generating && !readyDocUuid && (
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={!canGenerate()}
                  >
                    {t('btn_generate')}
                  </button>
                )}

                {generating && (
                  <div className="modal-status modal-status--pending">
                    <div className="modal-spinner" />
                    <span>{t('generating')}</span>
                  </div>
                )}

                {readyDocUuid && (
                  <div className="modal-status modal-status--success">
                    <span className="modal-status-icon">&#10003;</span>
                    <span>{t('modal_ready')}</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownload(readyDocUuid)}
                    >
                      {t('btn_download')}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setReadyDocUuid(null)
                        setError('')
                      }}
                    >
                      {t('modal_new_export')}
                    </button>
                  </div>
                )}

                {error && <p className="modal-error">{error}</p>}
              </div>

              {/* History section */}
              <div className="modal-section">
                <h3 className="modal-section-title">{t('history_title')}</h3>

                {historyLoading && historyItems.length === 0 && (
                  <p className="modal-empty">{t('modal_loading_history')}</p>
                )}

                {!historyLoading && historyItems.length === 0 && (
                  <p className="modal-empty">{t('modal_no_history')}</p>
                )}

                {historyItems.length > 0 && (
                  <>
                    <table className="unified-table export-modal-table">
                      <thead>
                        <tr>
                          <th>{t('history_col_date')}</th>
                          <th>{t('history_col_params')}</th>
                          <th>{t('history_col_size')}</th>
                          <th>{t('history_col_status')}</th>
                          <th>{t('history_col_actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyItems.map(entry => (
                          <tr
                            key={entry.uuid}
                            className={highlightedEntryUuid === entry.uuid ? 'modal-row--highlighted' : ''}
                          >
                            <td className="cell-nowrap">{formatDate(entry.created_at)}</td>
                            <td className="export-history-params">{renderParamBadges(entry)}</td>
                            <td className="cell-nowrap">{formatSize(entry.file_size_bytes)}</td>
                            <td>
                              <span className={`export-status-badge export-status-badge--${entry.status}`}>
                                {t(`status_${entry.status}`)}
                              </span>
                            </td>
                            <td className="cell-nowrap">
                              <div className="export-history-actions">
                                {entry.status === 'success' && entry.storage_document_uuid && (
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleDownload(entry.storage_document_uuid!)}
                                  >
                                    {t('history_btn_download')}
                                  </button>
                                )}
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleDeleteHistory(entry)}
                                >
                                  {t('history_btn_delete')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {historyPages > 1 && (
                      <div className="unified-pagination">
                        <div className="unified-pagination-info">
                          {t('history_total', { count: historyTotal })}
                        </div>
                        <div className="unified-pagination-controls">
                          <button
                            className="btn btn-sm btn-secondary"
                            disabled={historyPage <= 1}
                            onClick={() => goToHistoryPage(historyPage - 1)}
                          >
                            &#8249;
                          </button>
                          <span className="unified-pagination-current">{historyPage} / {historyPages}</span>
                          <button
                            className="btn btn-sm btn-secondary"
                            disabled={historyPage >= historyPages}
                            onClick={() => goToHistoryPage(historyPage + 1)}
                          >
                            &#8250;
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
