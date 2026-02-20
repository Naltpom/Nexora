import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../core/Layout'
import { useConfirm } from '../../core/ConfirmModal'
import api from '../../api'
import './_identity.scss'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Feature {
  name: string
  label: string
  description: string
  version: string
  parent: string | null
  children: string[]
  depends: string[]
  permissions: string[]
  is_core: boolean
  active: boolean
  has_routes: boolean
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function FeaturesAdminPage() {
  const { confirm } = useConfirm()
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState('')

  // Detail modal
  interface DetailItem { code: string; label?: string; description?: string }
  const [detailModal, setDetailModal] = useState<{ title: string; items: DetailItem[]; loading: boolean } | null>(null)

  const loadFeatures = useCallback(async () => {
    try {
      const res = await api.get('/features/')
      setFeatures(res.data)
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors du chargement des features' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeatures()
  }, [loadFeatures])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value.toLowerCase())
    }, 200)
  }

  const handleToggle = async (feature: Feature) => {
    const action = feature.active ? 'desactiver' : 'activer'
    const confirmed = await confirm({
      title: `${feature.active ? 'Desactiver' : 'Activer'} la feature`,
      message: `Etes-vous sur de vouloir ${action} la feature "${feature.label}" ?${
        feature.active && feature.children.length > 0
          ? `\n\nAttention : cette feature a ${feature.children.length} enfant(s) qui pourrai(en)t etre impacte(s).`
          : ''
      }`,
      confirmText: feature.active ? 'Desactiver' : 'Activer',
      variant: feature.active ? 'warning' : 'info',
    })
    if (!confirmed) return

    setToggling(feature.name)
    setMessage(null)
    try {
      const res = await api.put(`/features/${feature.name}/toggle`, { active: !feature.active })
      const cascaded: string[] = res.data.cascaded || []
      const cascadeText = cascaded.length > 0 ? ` (+ ${cascaded.length} enfant(s) desactive(s) : ${cascaded.join(', ')})` : ''
      setMessage({ type: 'success', text: `Feature "${feature.label}" ${!feature.active ? 'activee' : 'desactivee'}${cascadeText}` })
      await loadFeatures()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || `Erreur lors du changement de statut de "${feature.label}"` })
    } finally {
      setToggling(null)
    }
  }

  // --- Group features: parents first, then children ---
  const rootFeatures = features.filter(f => !f.parent)
  const childrenMap = features.reduce<Record<string, Feature[]>>((acc, f) => {
    if (f.parent) {
      if (!acc[f.parent]) acc[f.parent] = []
      acc[f.parent].push(f)
    }
    return acc
  }, {})

  // Build ordered list: parent then its children
  const orderedFeatures: { feature: Feature; isChild: boolean }[] = []
  for (const root of rootFeatures) {
    orderedFeatures.push({ feature: root, isChild: false })
    if (childrenMap[root.name]) {
      for (const child of childrenMap[root.name]) {
        orderedFeatures.push({ feature: child, isChild: true })
      }
    }
  }
  // Orphan children (parent not in list)
  features
    .filter(f => f.parent && !rootFeatures.find(r => r.name === f.parent))
    .forEach(f => orderedFeatures.push({ feature: f, isChild: false }))

  // Filter by search
  const filteredFeatures = search
    ? orderedFeatures.filter(({ feature }) =>
        feature.name.toLowerCase().includes(search) ||
        feature.label.toLowerCase().includes(search) ||
        feature.description.toLowerCase().includes(search)
      )
    : orderedFeatures

  return (
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Features' }]} title="Features">
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Gestion des features</h1>
            <p>Activez ou desactivez les fonctionnalites de l'application</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert-dynamic alert-dynamic--${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : features.length === 0 ? (
        <div className="unified-card empty-state">
          Aucune feature trouvee
        </div>
      ) : (
        <div className="unified-card full-width-breakout">
          {/* Search bar */}
          <div className="section-header">
            <input
              type="text"
              placeholder="Rechercher une feature..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-search-wide"
            />
          </div>

          <div className="table-container">
            <table className="unified-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Description</th>
                  <th>Version</th>
                  <th>Statut</th>
                  <th>Infos</th>
                  <th>Dependances</th>
                  <th className="text-center">Activer</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state-sm">
                      {search ? 'Aucune feature correspondante' : 'Aucune feature trouvee'}
                    </td>
                  </tr>
                ) : (
                  filteredFeatures.map(({ feature, isChild }) => (
                    <tr
                      key={feature.name}
                      className={feature.active ? '' : 'opacity-60'}
                    >
                      {/* Feature name */}
                      <td style={{ paddingLeft: isChild ? '48px' : undefined }}>
                        <div className="feature-name-col">
                          {isChild && (
                            <span className="feature-child-arrow">└</span>
                          )}
                          <div>
                            <div className="font-medium">{feature.label}</div>
                            <code className="text-gray-400-code">{feature.name}</code>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="feature-desc-col">
                        {feature.description || '\u2014'}
                      </td>

                      {/* Version */}
                      <td className="text-gray-500-sm nowrap">
                        v{feature.version}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${feature.active ? 'badge-success' : 'badge-warning'} text-xs`}>
                          {feature.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      {/* Info badges */}
                      <td>
                        <div className="flex-row-xs flex-wrap">
                          {feature.is_core && (
                            <span className="badge badge-secondary text-xs">Core</span>
                          )}
                          {feature.has_routes && (
                            <span className="badge badge-info text-xs">Routes</span>
                          )}
                          {feature.permissions.length > 0 && (
                            <span
                              className="badge badge-secondary text-xs cursor-pointer"
                              onClick={async () => {
                                setDetailModal({
                                  title: `Permissions de ${feature.label}`,
                                  items: [],
                                  loading: true,
                                })
                                try {
                                  const res = await api.get('/permissions/', { params: { feature: feature.name } })
                                  setDetailModal({
                                    title: `Permissions de ${feature.label}`,
                                    items: res.data.map((p: any) => ({ code: p.code, label: p.label, description: p.description })),
                                    loading: false,
                                  })
                                } catch {
                                  setDetailModal({
                                    title: `Permissions de ${feature.label}`,
                                    items: feature.permissions.map(code => ({ code })),
                                    loading: false,
                                  })
                                }
                              }}
                              title="Voir les permissions"
                            >
                              {feature.permissions.length} perm{feature.permissions.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {feature.children.length > 0 && (
                            <span
                              className="badge badge-secondary text-xs cursor-pointer"
                              onClick={() => {
                                const childItems = feature.children.map(name => {
                                  const child = features.find(f => f.name === name)
                                  return {
                                    code: name,
                                    label: child?.label,
                                    description: child?.description,
                                  }
                                })
                                setDetailModal({
                                  title: `Enfants de ${feature.label}`,
                                  items: childItems,
                                  loading: false,
                                })
                              }}
                              title="Voir les enfants"
                            >
                              {feature.children.length} enfant{feature.children.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Dependencies */}
                      <td className="text-gray-500-sm">
                        {feature.depends.length > 0 ? feature.depends.join(', ') : '\u2014'}
                      </td>

                      {/* Toggle */}
                      <td className="text-center">
                        {feature.is_core ? (
                          <span className="feature-locked">
                            Verrouille
                          </span>
                        ) : (
                          <label className="toggle" style={{ cursor: toggling === feature.name ? 'wait' : 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={feature.active}
                              onChange={() => handleToggle(feature)}
                              disabled={toggling === feature.name}
                            />
                            <span className="toggle-slider" />
                          </label>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal (permissions / children list) */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div className="modal modal-narrow" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{detailModal.title}</h2>
              <button className="modal-close" onClick={() => setDetailModal(null)}>&times;</button>
            </div>
            <div className="modal-body modal-body-scroll">
              {detailModal.loading ? (
                <div className="text-center p-24"><div className="spinner" /></div>
              ) : detailModal.items.length === 0 ? (
                <p className="text-gray-400 text-center">Aucun element</p>
              ) : (
                <div className="flex-col-sm">
                  {detailModal.items.map((item) => (
                    <div
                      key={item.code}
                      className="detail-item"
                    >
                      {item.label && (
                        <div className="detail-item-label">{item.label}</div>
                      )}
                      <code className="text-gray-500-code">{item.code}</code>
                      {item.description && (
                        <div className="detail-item-desc">{item.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
