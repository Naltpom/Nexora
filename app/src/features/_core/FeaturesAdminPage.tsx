import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../core/Layout'
import { useConfirm } from '../../core/ConfirmModal'
import api from '../../api'

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
        <div
          className="card"
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: message.type === 'success' ? 'var(--success-bg, #ecfdf5)' : 'var(--danger-bg, #fef2f2)',
            color: message.type === 'success' ? 'var(--success, #059669)' : 'var(--danger, #DC2626)',
            border: `1px solid ${message.type === 'success' ? 'var(--success, #059669)' : 'var(--danger, #DC2626)'}20`,
          }}
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : features.length === 0 ? (
        <div className="unified-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-400)' }}>
          Aucune feature trouvee
        </div>
      ) : (
        <div className="unified-card full-width-breakout">
          {/* Search bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <input
              type="text"
              placeholder="Rechercher une feature..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid var(--gray-200)',
                borderRadius: '8px',
                background: 'var(--gray-50)',
                color: 'var(--text-primary, var(--gray-700))',
              }}
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
                  <th style={{ textAlign: 'center' }}>Activer</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                      {search ? 'Aucune feature correspondante' : 'Aucune feature trouvee'}
                    </td>
                  </tr>
                ) : (
                  filteredFeatures.map(({ feature, isChild }) => (
                    <tr
                      key={feature.name}
                      style={{ opacity: feature.active ? 1 : 0.6 }}
                    >
                      {/* Feature name */}
                      <td style={{ paddingLeft: isChild ? '48px' : undefined }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isChild && (
                            <span style={{ color: 'var(--gray-300)', fontSize: '14px', marginLeft: '-20px', marginRight: '4px' }}>└</span>
                          )}
                          <div>
                            <div style={{ fontWeight: 500 }}>{feature.label}</div>
                            <code style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{feature.name}</code>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ fontSize: '13px', color: 'var(--gray-500)', maxWidth: '300px' }}>
                        {feature.description || '\u2014'}
                      </td>

                      {/* Version */}
                      <td style={{ fontSize: '13px', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                        v{feature.version}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${feature.active ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '11px' }}>
                          {feature.active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      {/* Info badges */}
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {feature.is_core && (
                            <span className="badge badge-secondary" style={{ fontSize: '11px' }}>Core</span>
                          )}
                          {feature.has_routes && (
                            <span className="badge badge-info" style={{ fontSize: '11px' }}>Routes</span>
                          )}
                          {feature.permissions.length > 0 && (
                            <span
                              className="badge badge-secondary"
                              style={{ fontSize: '11px', cursor: 'pointer' }}
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
                              className="badge badge-secondary"
                              style={{ fontSize: '11px', cursor: 'pointer' }}
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
                      <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                        {feature.depends.length > 0 ? feature.depends.join(', ') : '\u2014'}
                      </td>

                      {/* Toggle */}
                      <td style={{ textAlign: 'center' }}>
                        {feature.is_core ? (
                          <span style={{ fontSize: '12px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{detailModal.title}</h2>
              <button className="modal-close" onClick={() => setDetailModal(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {detailModal.loading ? (
                <div style={{ textAlign: 'center', padding: '24px' }}><div className="spinner" /></div>
              ) : detailModal.items.length === 0 ? (
                <p style={{ color: 'var(--gray-400)', textAlign: 'center' }}>Aucun element</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detailModal.items.map((item) => (
                    <div
                      key={item.code}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--gray-200)',
                      }}
                    >
                      {item.label && (
                        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>{item.label}</div>
                      )}
                      <code style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{item.code}</code>
                      {item.description && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: '4px' }}>{item.description}</div>
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
