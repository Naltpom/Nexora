import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import { usePermission } from '../PermissionContext'
import { Pagination } from '../../core/pagination'
import './events.scss'

/* -- Types -- */

interface EventItem {
  id: number
  event_type: string
  actor_id: number
  actor_email: string
  resource_type: string
  resource_id: number
  payload: Record<string, unknown>
  created_at: string
}

interface EventListResponse {
  items: EventItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

/* -- Memoized Row -- */

interface EventTableRowProps {
  evt: EventItem
  isExpanded: boolean
  onTogglePayload: (id: number) => void
  formatDate: (iso: string) => string
  t: (key: string, opts?: Record<string, unknown>) => string
}

const EventTableRow = memo(function EventTableRow({ evt, isExpanded, onTogglePayload, formatDate, t }: EventTableRowProps) {
  return (
    <tr>
      <td className="text-gray-500-sm nowrap">{formatDate(evt.created_at)}</td>
      <td><code className="badge-tag badge-tag--mono">{evt.event_type}</code></td>
      <td>{evt.actor_email}</td>
      <td>
        <span className="resource-badge">
          {evt.resource_type}
          <span className="resource-badge-id">#{evt.resource_id}</span>
        </span>
      </td>
      <td>
        {Object.keys(evt.payload).length > 0 ? (
          <button
            className="events-payload-toggle"
            onClick={() => onTogglePayload(evt.id)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('masquer_payload') : t('aria_voir_payload', { type: evt.event_type })}
          >
            {isExpanded ? t('masquer_payload') : t('voir_payload')}
          </button>
        ) : (
          <span className="text-gray-500" aria-label={t('aria_no_payload')}>{'\u2014'}</span>
        )}
      </td>
    </tr>
  )
})

/* -- Component -- */

export default function EventsPage() {
  const { t } = useTranslation('event')
  const { can } = usePermission()
  const canReadAll = can('event.read_all')

  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(25)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showAll, setShowAll] = useState(false)
  const [expandedPayloads, setExpandedPayloads] = useState<Set<number>>(new Set())
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async (
    p?: number, s?: string, pp?: number, sb?: string, sd?: string, all?: boolean
  ) => {
    const currentPage = p ?? page
    const currentSearch = s ?? search
    const currentPerPage = pp ?? perPage
    const currentSortBy = sb ?? sortBy
    const currentSortDir = sd ?? sortDir
    const currentShowAll = all ?? showAll

    try {
      const res = await api.get<EventListResponse>('/events/', {
        params: {
          page: currentPage,
          per_page: currentPerPage,
          search: currentSearch,
          sort_by: currentSortBy,
          sort_dir: currentSortDir,
          show_all: currentShowAll,
        },
      })
      setEvents(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.pages)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, search, perPage, sortBy, sortDir, showAll])

  useEffect(() => { loadData() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleToggleShowAll = () => {
    const next = !showAll
    setShowAll(next)
    setPage(1)
    loadData(1, undefined, undefined, undefined, undefined, next)
  }

  const handlePerPageChange = (pp: number) => {
    setPerPage(pp)
    setPage(1)
    loadData(1, undefined, pp)
  }

  const togglePayload = useCallback((id: number) => {
    setExpandedPayloads(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString()
  }

  const getAriaSort = (field: string): 'ascending' | 'descending' | 'none' => {
    if (sortBy !== field) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  return (
    <Layout breadcrumb={[{ label: t('breadcrumb_accueil'), path: '/' }, { label: t('breadcrumb_events') }]} title={t('page_title_journal')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('titre_journal')}</h1>
            <p>{t('sous_titre_journal')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{total}</span>
              <span className="page-header-stat-label">{t('stat_events')}</span>
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
            <div className="events-toolbar" role="search" aria-label={t('aria_search_events')}>
              <input
                type="text"
                className="events-search-input"
                placeholder={t('rechercher_evenement')}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label={t('aria_search_events')}
              />
              {canReadAll && (
                <label className="events-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showAll}
                    onChange={handleToggleShowAll}
                    aria-label={t('afficher_tous')}
                  />
                  {t('afficher_tous')}
                </label>
              )}
            </div>

            {events.length === 0 ? (
              <div className="table-no-match" role="status">
                {t('aucun_event')}
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="unified-table" aria-label={t('aria_events_table_caption')}>
                    <caption className="sr-only">{t('aria_events_table_caption')}</caption>
                    <colgroup>
                      <col className="col-date" />
                      <col className="col-evtype" />
                      <col className="col-actor" />
                      <col className="col-resource" />
                      <col className="col-payload" />
                    </colgroup>
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
                          {t('col_date')} {sortBy === 'created_at' && <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                        </th>
                        <th
                          className="th-sortable"
                          onClick={() => handleSort('event_type')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'event_type')}
                          role="columnheader"
                          tabIndex={0}
                          aria-sort={getAriaSort('event_type')}
                          scope="col"
                        >
                          {t('col_type')} {sortBy === 'event_type' && <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                        </th>
                        <th scope="col">{t('col_acteur')}</th>
                        <th
                          className="th-sortable"
                          onClick={() => handleSort('resource_type')}
                          onKeyDown={(e) => handleSortKeyDown(e, 'resource_type')}
                          role="columnheader"
                          tabIndex={0}
                          aria-sort={getAriaSort('resource_type')}
                          scope="col"
                        >
                          {t('col_ressource')} {sortBy === 'resource_type' && <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                        </th>
                        <th scope="col">{t('col_payload')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map(evt => (
                        <EventTableRow
                          key={evt.id}
                          evt={evt}
                          isExpanded={expandedPayloads.has(evt.id)}
                          onTogglePayload={togglePayload}
                          formatDate={formatDate}
                          t={t}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Expanded payloads */}
                {events.filter(evt => expandedPayloads.has(evt.id)).map(evt => (
                  <div key={`payload-${evt.id}`} className="events-payload-block" role="region" aria-label={t('aria_payload_for', { type: evt.event_type })}>
                    <div className="events-payload-header">
                      <code className="badge-tag badge-tag--mono">{evt.event_type}</code>
                      <span className="text-gray-500-sm">{formatDate(evt.created_at)}</span>
                    </div>
                    <pre className="events-payload-json">{JSON.stringify(evt.payload, null, 2)}</pre>
                  </div>
                ))}
              </>
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            countDisplay={`${total} ${t('stat_events')}`}
            onPageChange={goToPage}
            onPerPageChange={handlePerPageChange}
          />
        </>
      )}
    </Layout>
  )
}
