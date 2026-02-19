import { useState, useEffect, useCallback } from 'react'
import Layout from '../../core/Layout'
import api from '../../api'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Permission {
  id: number
  code: string
  feature: string
  label: string
  description: string
}

interface GlobalPermission {
  permission_id: number
  granted: boolean
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function PermissionsAdminPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [globalPermissions, setGlobalPermissions] = useState<GlobalPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [activeTab, setActiveTab] = useState<'permissions' | 'global'>('permissions')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadPermissions = useCallback(async () => {
    try {
      const res = await api.get('/permissions/')
      setPermissions(res.data)
    } catch {
      console.error('Erreur lors du chargement des permissions')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadGlobalPermissions = useCallback(async () => {
    setLoadingGlobal(true)
    try {
      const res = await api.get('/permissions/global')
      setGlobalPermissions(res.data)
    } catch {
      console.error('Erreur lors du chargement des permissions globales')
    } finally {
      setLoadingGlobal(false)
    }
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  useEffect(() => {
    if (activeTab === 'global') {
      loadGlobalPermissions()
    }
  }, [activeTab, loadGlobalPermissions])

  // --- Group permissions by feature ---
  const permissionsByFeature = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.feature]) acc[perm.feature] = []
    acc[perm.feature].push(perm)
    return acc
  }, {})

  // --- Global permission helpers ---
  const isGlobalGranted = (permissionId: number): boolean => {
    const gp = globalPermissions.find(g => g.permission_id === permissionId)
    return gp?.granted ?? false
  }

  const toggleGlobalPermission = (permissionId: number) => {
    setGlobalPermissions(prev => {
      const existing = prev.find(g => g.permission_id === permissionId)
      if (existing) {
        return prev.map(g =>
          g.permission_id === permissionId ? { ...g, granted: !g.granted } : g
        )
      }
      return [...prev, { permission_id: permissionId, granted: true }]
    })
  }

  const saveGlobalPermissions = async () => {
    setSavingGlobal(true)
    setMessage(null)
    try {
      await api.put('/permissions/global', {
        permissions: globalPermissions.map(g => ({
          permission_id: g.permission_id,
          granted: g.granted,
        })),
      })
      setMessage({ type: 'success', text: 'Permissions globales enregistrees' })
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde des permissions globales' })
    } finally {
      setSavingGlobal(false)
    }
  }

  return (
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Permissions' }]} title="Permissions">
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Gestion des permissions</h1>
            <p>Consultez les permissions et configurez les permissions globales</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid var(--gray-200)' }}>
        <button
          onClick={() => setActiveTab('permissions')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'permissions' ? 600 : 400,
            color: activeTab === 'permissions' ? 'var(--primary, #1E40AF)' : 'var(--gray-500)',
            borderBottom: activeTab === 'permissions' ? '2px solid var(--primary, #1E40AF)' : '2px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s',
          }}
        >
          Permissions
        </button>
        <button
          onClick={() => setActiveTab('global')}
          style={{
            padding: '10px 20px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'global' ? 600 : 400,
            color: activeTab === 'global' ? 'var(--primary, #1E40AF)' : 'var(--gray-500)',
            borderBottom: activeTab === 'global' ? '2px solid var(--primary, #1E40AF)' : '2px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.15s',
          }}
        >
          Permissions globales
        </button>
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

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        loading ? (
          <div className="spinner" />
        ) : Object.keys(permissionsByFeature).length === 0 ? (
          <div className="unified-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-400)' }}>
            Aucune permission trouvee
          </div>
        ) : (
          Object.entries(permissionsByFeature).map(([feature, perms]) => (
            <div key={feature} style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                {feature}
              </h2>
              <div className="unified-card card-table">
                <div className="table-container">
                  <table className="unified-table">
                    <thead>
                      <tr>
                        <th style={{ width: '200px' }}>Code</th>
                        <th style={{ width: '200px' }}>Label</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((perm) => (
                        <tr key={perm.id}>
                          <td>
                            <code style={{ fontSize: '12px', backgroundColor: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                              {perm.code}
                            </code>
                          </td>
                          <td><strong>{perm.label}</strong></td>
                          <td style={{ color: 'var(--gray-500)' }}>{perm.description || '\u2014'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )
      )}

      {/* Global Permissions Tab */}
      {activeTab === 'global' && (
        loadingGlobal ? (
          <div className="spinner" />
        ) : Object.keys(permissionsByFeature).length === 0 ? (
          <div className="unified-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-400)' }}>
            Aucune permission trouvee
          </div>
        ) : (
          <>
            {Object.entries(permissionsByFeature).map(([feature, perms]) => (
              <div key={feature} style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  {feature}
                </h2>
                <div className="unified-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {perms.map((perm) => {
                      const granted = isGlobalGranted(perm.id)
                      return (
                        <div
                          key={perm.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: granted ? 'var(--primary-bg, #eff6ff)' : 'var(--gray-50, #f9fafb)',
                            border: '1px solid',
                            borderColor: granted ? 'var(--primary, #1E40AF)20' : 'var(--gray-200)',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <strong style={{ fontSize: '14px' }}>{perm.label}</strong>
                              <code style={{ fontSize: '11px', backgroundColor: 'var(--gray-100)', padding: '1px 4px', borderRadius: '3px', color: 'var(--gray-500)' }}>
                                {perm.code}
                              </code>
                            </div>
                            {perm.description && (
                              <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{perm.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleGlobalPermission(perm.id)}
                            style={{
                              position: 'relative',
                              width: '44px',
                              height: '24px',
                              borderRadius: '12px',
                              border: 'none',
                              backgroundColor: granted ? 'var(--primary, #1E40AF)' : 'var(--gray-300)',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              flexShrink: 0,
                              marginLeft: '16px',
                            }}
                            title={granted ? 'Desactiver' : 'Activer'}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: '2px',
                                left: granted ? '22px' : '2px',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                            />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button className="btn btn-primary" onClick={saveGlobalPermissions} disabled={savingGlobal}>
                {savingGlobal ? 'Enregistrement...' : 'Enregistrer les permissions globales'}
              </button>
            </div>
          </>
        )
      )}
    </Layout>
  )
}
