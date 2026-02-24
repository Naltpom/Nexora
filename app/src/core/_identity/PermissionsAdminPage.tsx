import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './_identity.scss'
import Layout from '../../core/Layout'
import { usePermission } from '../PermissionContext'
import api from '../../api'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface AssignmentRules {
  user?: boolean
  role?: boolean
  global?: boolean
}

interface Permission {
  id: number
  code: string
  feature: string
  label: string
  description: string
  assignment_rules?: AssignmentRules
}

interface GlobalPermission {
  permission_id: number
  granted: boolean
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function PermissionsAdminPage() {
  const { t } = useTranslation('_identity')
  const { can, refreshPermissions } = usePermission()
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
      await refreshPermissions()
      setMessage({ type: 'success', text: t('permissions_admin.global_save_success') })
    } catch {
      setMessage({ type: 'error', text: t('permissions_admin.global_save_error') })
    } finally {
      setSavingGlobal(false)
    }
  }

  return (
    <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('permissions_admin.breadcrumb_permissions') }]} title={t('permissions_admin.breadcrumb_permissions')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('permissions_admin.page_title')}</h1>
            <p>{t('permissions_admin.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          onClick={() => setActiveTab('permissions')}
          className={`tab-button ${activeTab === 'permissions' ? 'tab-button--active' : 'tab-button--inactive'}`}
        >
          {t('permissions_admin.tab_permissions')}
        </button>
        <button
          onClick={() => setActiveTab('global')}
          className={`tab-button ${activeTab === 'global' ? 'tab-button--active' : 'tab-button--inactive'}`}
        >
          {t('permissions_admin.tab_global')}
        </button>
      </div>

      {message && (
        <div className={`alert-dynamic ${message.type === 'success' ? 'alert-dynamic--success' : 'alert-dynamic--error'}`}>
          {message.text}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        loading ? (
          <div className="spinner" />
        ) : Object.keys(permissionsByFeature).length === 0 ? (
          <div className="unified-card empty-state">
            {t('permissions_admin.empty_state')}
          </div>
        ) : (
          Object.entries(permissionsByFeature).map(([feature, perms]) => (
            <div key={feature} className="section-mb-lg">
              <h2 className="section-category-title">
                {feature}
              </h2>
              <div className="unified-card card-table">
                <div className="table-container">
                  <table className="unified-table">
                    <thead>
                      <tr>
                        <th className="col-200">{t('permissions_admin.th_code')}</th>
                        <th className="col-200">{t('permissions_admin.th_label')}</th>
                        <th>{t('permissions_admin.th_description')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.map((perm) => (
                        <tr key={perm.id}>
                          <td>
                            <code className="badge-tag badge-tag--mono">
                              {perm.code}
                            </code>
                          </td>
                          <td><strong>{perm.label}</strong></td>
                          <td className="text-gray-500">{perm.description || '\u2014'}</td>
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
          <div className="unified-card empty-state">
            {t('permissions_admin.empty_state')}
          </div>
        ) : (
          <>
            {Object.entries(permissionsByFeature).map(([feature, perms]) => {
              const filteredPerms = perms.filter(p => p.assignment_rules?.global !== false)
              if (filteredPerms.length === 0) return null
              return (
              <div key={feature} className="section-mb-lg">
                <h2 className="section-category-title">
                  {feature}
                </h2>
                <div className="unified-card p-16">
                  <div className="flex-col-md">
                    {filteredPerms.map((perm) => {
                      const granted = isGlobalGranted(perm.id)
                      return (
                        <div
                          key={perm.id}
                          className={`global-perm-row ${granted ? 'global-perm-row--on' : 'global-perm-row--off'}`}
                        >
                          <div className="flex-1">
                            <div className="flex-center mb-2">
                              <strong>{perm.label}</strong>
                              <code className="badge-tag badge-tag--mono-sm">
                                {perm.code}
                              </code>
                            </div>
                            {perm.description && (
                              <div className="text-gray-500-sm">{perm.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => toggleGlobalPermission(perm.id)}
                            className={`toggle-switch ${granted ? 'toggle-switch--on' : 'toggle-switch--off'}`}
                            title={granted ? t('permissions_admin.tooltip_deactivate') : t('permissions_admin.tooltip_activate')}
                            disabled={!can('permissions.manage')}
                          >
                            <span
                              className={`toggle-switch-knob ${granted ? 'toggle-switch-knob--on' : 'toggle-switch-knob--off'}`}
                            />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              )
            })}

            {can('permissions.manage') && (
              <div className="flex-end mt-8">
                <button className="btn btn-primary" onClick={saveGlobalPermissions} disabled={savingGlobal}>
                  {savingGlobal ? t('permissions_admin.global_saving') : t('permissions_admin.global_save')}
                </button>
              </div>
            )}
          </>
        )
      )}
    </Layout>
  )
}
