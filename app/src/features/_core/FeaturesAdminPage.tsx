import { useState, useEffect, useCallback } from 'react'
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
      await api.put(`/features/${feature.name}/toggle`, { active: !feature.active })
      setMessage({ type: 'success', text: `Feature "${feature.label}" ${!feature.active ? 'activee' : 'desactivee'}` })
      await loadFeatures()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || `Erreur lors du changement de statut de "${feature.label}"` })
    } finally {
      setToggling(null)
    }
  }

  // --- Group features: parents first, then children indented ---
  const rootFeatures = features.filter(f => !f.parent)
  const childrenMap = features.reduce<Record<string, Feature[]>>((acc, f) => {
    if (f.parent) {
      if (!acc[f.parent]) acc[f.parent] = []
      acc[f.parent].push(f)
    }
    return acc
  }, {})

  const renderFeatureCard = (feature: Feature, isChild: boolean = false) => (
    <div
      key={feature.name}
      className="unified-card"
      style={{
        marginBottom: '12px',
        marginLeft: isChild ? '32px' : '0',
        padding: '20px',
        borderLeft: isChild ? '3px solid var(--primary, #1E40AF)40' : undefined,
        opacity: feature.active ? 1 : 0.7,
        transition: 'opacity 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        {/* Left: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{feature.label}</h3>
            <code style={{ fontSize: '12px', backgroundColor: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
              {feature.name}
            </code>
            <span
              className={`badge ${feature.active ? 'badge-success' : 'badge-warning'}`}
              style={{ fontSize: '11px' }}
            >
              {feature.active ? 'Actif' : 'Inactif'}
            </span>
            {feature.is_core && (
              <span
                className="badge"
                style={{
                  fontSize: '11px',
                  backgroundColor: 'var(--gray-100)',
                  color: 'var(--gray-600)',
                  border: '1px solid var(--gray-300)',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px', verticalAlign: 'middle' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Core
              </span>
            )}
            {feature.has_routes && (
              <span
                className="badge"
                style={{
                  fontSize: '11px',
                  backgroundColor: 'var(--primary-bg, #eff6ff)',
                  color: 'var(--primary, #1E40AF)',
                  border: '1px solid var(--primary, #1E40AF)20',
                }}
              >
                Routes
              </span>
            )}
            <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>v{feature.version}</span>
          </div>

          {feature.description && (
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: '0 0 10px 0' }}>
              {feature.description}
            </p>
          )}

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
            {feature.parent && (
              <span style={{ color: 'var(--gray-500)' }}>
                <strong>Parent :</strong> {feature.parent}
              </span>
            )}
            {feature.children.length > 0 && (
              <span style={{ color: 'var(--gray-500)' }}>
                <strong>Enfants :</strong> {feature.children.join(', ')}
              </span>
            )}
            {feature.depends.length > 0 && (
              <span style={{ color: 'var(--gray-500)' }}>
                <strong>Depend de :</strong> {feature.depends.join(', ')}
              </span>
            )}
            {feature.permissions.length > 0 && (
              <span style={{ color: 'var(--gray-500)' }}>
                <span className="badge badge-info" style={{ fontSize: '11px' }}>
                  {feature.permissions.length} permission{feature.permissions.length > 1 ? 's' : ''}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: toggle */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {feature.is_core ? (
            <span style={{ fontSize: '12px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
              Verrouille
            </span>
          ) : (
            <button
              onClick={() => handleToggle(feature)}
              disabled={toggling === feature.name}
              style={{
                position: 'relative',
                width: '48px',
                height: '26px',
                borderRadius: '13px',
                border: 'none',
                backgroundColor: feature.active ? 'var(--primary, #1E40AF)' : 'var(--gray-300)',
                cursor: toggling === feature.name ? 'wait' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: toggling === feature.name ? 0.6 : 1,
              }}
              title={feature.active ? 'Desactiver' : 'Activer'}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: feature.active ? '25px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  )

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
        <div>
          {rootFeatures.map((feature) => (
            <div key={feature.name}>
              {renderFeatureCard(feature, false)}
              {childrenMap[feature.name]?.map((child) => renderFeatureCard(child, true))}
            </div>
          ))}

          {/* Render orphan children (whose parent is not in the list) */}
          {features
            .filter(f => f.parent && !rootFeatures.find(r => r.name === f.parent))
            .map((feature) => renderFeatureCard(feature, false))}
        </div>
      )}
    </Layout>
  )
}
