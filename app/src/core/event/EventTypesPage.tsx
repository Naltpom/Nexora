import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import './events.scss'

/* -- Types -- */

interface EventType {
  event_type: string
  label: string
  category: string
  description: string | null
  feature: string
}

/* -- Component -- */

export default function EventTypesPage() {
  const { t } = useTranslation('event')
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadEventTypes = useCallback(async () => {
    try {
      const res = await api.get('/events/event-types')
      setEventTypes(res.data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEventTypes()
  }, [loadEventTypes])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value.toLowerCase())
    }, 200)
  }

  // Group by feature
  const grouped: Record<string, EventType[]> = {}
  for (const evt of eventTypes) {
    if (!grouped[evt.feature]) grouped[evt.feature] = []
    grouped[evt.feature].push(evt)
  }

  // Filter
  const filteredGroups: Record<string, EventType[]> = {}
  for (const [feature, events] of Object.entries(grouped)) {
    const filtered = search
      ? events.filter(e =>
          e.event_type.toLowerCase().includes(search) ||
          e.label.toLowerCase().includes(search) ||
          e.category.toLowerCase().includes(search) ||
          (e.description || '').toLowerCase().includes(search) ||
          feature.toLowerCase().includes(search)
        )
      : events
    if (filtered.length > 0) {
      filteredGroups[feature] = filtered
    }
  }

  const totalEvents = Object.values(filteredGroups).reduce((sum, evts) => sum + evts.length, 0)
  const featureCount = Object.keys(filteredGroups).length

  return (
    <Layout breadcrumb={[{ label: t('breadcrumb_accueil'), path: '/' }, { label: t('breadcrumb_events'), path: '/admin/events' }, { label: t('breadcrumb_types') }]} title={t('page_title_catalogue')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('titre_catalogue')}</h1>
            <p>{t('sous_titre_catalogue')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{totalEvents}</span>
              <span className="page-header-stat-label">{t('stat_types')}</span>
            </div>
            <div className="page-header-stat">
              <span className="page-header-stat-value">{featureCount}</span>
              <span className="page-header-stat-label">{t('stat_features')}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-busy="true" role="status">
          <span className="sr-only">{t('aria_loading')}</span>
        </div>
      ) : eventTypes.length === 0 ? (
        <div className="unified-card table-no-match" role="status">
          {t('aucun_type_declare')}
        </div>
      ) : (
        <>
          <div className="unified-card events-search-standalone" role="search" aria-label={t('aria_search_event_types')}>
            <input
              type="text"
              className="events-search-input"
              placeholder={t('rechercher_type')}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label={t('aria_search_event_types')}
            />
          </div>

          {Object.keys(filteredGroups).length === 0 ? (
            <div className="unified-card table-no-match" role="status">
              {t('aucun_evenement_correspondant')}
            </div>
          ) : (
            Object.entries(filteredGroups).map(([feature, events]) => (
              <div key={feature} className="section-mb-lg">
                <h2 className="section-category-title">
                  {feature}
                  <span className="badge badge-secondary events-badge-sm events-feature-count">
                    {events.length} {events.length > 1 ? t('event_count_plural') : t('event_count_singular')}
                  </span>
                </h2>
                <div className="unified-card card-table">
                  <div className="table-container">
                    <table className="unified-table" aria-label={t('aria_types_table_caption', { feature })}>
                      <caption className="sr-only">{t('aria_types_table_caption', { feature })}</caption>
                      <thead>
                        <tr>
                          <th scope="col" className="col-200">{t('col_event_type')}</th>
                          <th scope="col" className="col-200">{t('col_label')}</th>
                          <th scope="col" className="col-120">{t('col_categorie')}</th>
                          <th scope="col">{t('col_description')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map(evt => (
                          <tr key={evt.event_type}>
                            <td>
                              <code className="badge-tag badge-tag--mono">{evt.event_type}</code>
                            </td>
                            <td><strong>{evt.label}</strong></td>
                            <td>
                              <span className="badge badge-info events-badge-sm">{evt.category}</span>
                            </td>
                            <td className="text-gray-500">{evt.description || '\u2014'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </Layout>
  )
}
