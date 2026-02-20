import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../core/Layout'
import api from '../../api'
import './events.scss'

/* -- Types -- */

interface EventType {
  event_type: string
  label: string
  category: string
  description: string | null
  admin_only: boolean
  feature: string
}

/* -- Component -- */

export default function EventsPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set())

  const loadEventTypes = useCallback(async () => {
    try {
      const res = await api.get('/events/event-types')
      setEventTypes(res.data || [])
      // Expand all features by default
      const features = new Set(((res.data || []) as EventType[]).map((e: EventType) => e.feature))
      setExpandedFeatures(features)
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

  const toggleFeature = (feature: string) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(feature)) {
        next.delete(feature)
      } else {
        next.add(feature)
      }
      return next
    })
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
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Events' }]} title="Events">
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Catalogue d'evenements</h1>
            <p>Types d'evenements declares par les features actives</p>
          </div>
          <div className="events-stats">
            <div className="events-stat">
              <span className="events-stat-value">{totalEvents}</span>
              <span className="events-stat-label">events</span>
            </div>
            <div className="events-stat">
              <span className="events-stat-value">{featureCount}</span>
              <span className="events-stat-label">features</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : eventTypes.length === 0 ? (
        <div className="unified-card events-empty-state">
          Aucun type d'evenement declare
        </div>
      ) : (
        <div className="unified-card full-width-breakout">
          <div className="events-search-bar">
            <input
              type="text"
              className="events-search-input"
              placeholder="Rechercher un evenement..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {Object.keys(filteredGroups).length === 0 ? (
            <div className="events-no-match">
              Aucun evenement correspondant
            </div>
          ) : (
            <div className="events-list">
              {Object.entries(filteredGroups).map(([feature, events]) => (
                <div key={feature} className="events-feature-group">
                  <div
                    className="events-feature-header"
                    onClick={() => toggleFeature(feature)}
                  >
                    <div className="events-feature-header-left">
                      <svg
                        className={`events-chevron ${expandedFeatures.has(feature) ? 'events-chevron-open' : ''}`}
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <span className="events-feature-name">{feature}</span>
                      <span className="badge badge-secondary events-badge-sm">
                        {events.length} event{events.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {expandedFeatures.has(feature) && (
                    <div className="table-container">
                      <table className="unified-table">
                        <colgroup>
                          <col className="col-type" />
                          <col className="col-label" />
                          <col className="col-category" />
                          <col className="col-desc" />
                          <col className="col-access" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Event Type</th>
                            <th>Label</th>
                            <th>Categorie</th>
                            <th>Description</th>
                            <th>Acces</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map(evt => (
                            <tr key={evt.event_type}>
                              <td>
                                <code className="events-code">{evt.event_type}</code>
                              </td>
                              <td className="events-cell-label">{evt.label}</td>
                              <td>
                                <span className="badge badge-info events-badge-sm">
                                  {evt.category}
                                </span>
                              </td>
                              <td className="events-cell-desc">
                                {evt.description || '\u2014'}
                              </td>
                              <td>
                                {evt.admin_only ? (
                                  <span className="badge badge-warning events-badge-sm">Admin</span>
                                ) : (
                                  <span className="badge badge-success events-badge-sm">Tous</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
