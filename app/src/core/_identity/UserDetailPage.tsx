import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import { usePermission } from '../PermissionContext'
import api from '../../api'
import './_identity.scss'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface RoleBasic {
  id: number
  slug: string
  name: string
  description: string | null
}

interface ResolvedPermission {
  permission_id: number
  code: string
  label: string | null
  description: string | null
  feature: string
  effective: boolean
  source: string
  user_override: boolean | null
  role_granted: boolean | null
  global_granted: boolean | null
}

interface UserDetail {
  id: number
  uuid: string
  email: string
  first_name: string
  last_name: string
  auth_source: string
  is_active: boolean
  is_super_admin: boolean
  last_login: string | null
  last_active: string | null
  created_at: string
  roles: RoleBasic[]
  resolved_permissions: ResolvedPermission[]
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function UserDetailPage() {
  const { t } = useTranslation('_identity')
  const { uuid } = useParams<{ uuid: string }>()
  const { can } = usePermission()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [allRoles, setAllRoles] = useState<RoleBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [permSearch, setPermSearch] = useState('')

  // Editable form state
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    is_super_admin: false,
  })

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const loadUser = useCallback(async () => {
    try {
      const [userRes, rolesRes] = await Promise.all([
        api.get(`/users/by-uuid/${uuid}`),
        api.get('/roles/'),
      ])
      const u: UserDetail = userRes.data
      setUser(u)
      setForm({
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        is_active: u.is_active,
        is_super_admin: u.is_super_admin,
      })
      setAllRoles(rolesRes.data.map((r: any) => ({ id: r.id, name: r.name, description: r.description })))
    } catch {
      showMessage('error', t('user_detail.load_error'))
    } finally {
      setLoading(false)
    }
  }, [uuid])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  /* ---- Save profile ---- */
  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await api.put(`/users/by-uuid/${uuid}`, form)
      showMessage('success', t('user_detail.save_success'))
      await loadUser()
    } catch (err: any) {
      showMessage('error', err.response?.data?.detail || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  /* ---- Toggle role ---- */
  const handleToggleRole = async (roleId: number) => {
    if (!user) return
    const currentIds = user.roles.map(r => r.id)
    const newIds = currentIds.includes(roleId)
      ? currentIds.filter(id => id !== roleId)
      : [...currentIds, roleId]

    try {
      await api.put(`/users/by-uuid/${uuid}/roles`, { role_ids: newIds })
      await loadUser()
    } catch (err: any) {
      showMessage('error', err.response?.data?.detail || t('common.error'))
    }
  }

  /* ---- Permission override cycle: null → granted → denied → null ---- */
  const handlePermissionCycle = async (perm: ResolvedPermission) => {
    if (!user) return
    const current = perm.user_override

    try {
      if (current === null) {
        // null → granted
        await api.post(`/users/by-uuid/${uuid}/permissions/override`, {
          permission_id: perm.permission_id,
          granted: true,
        })
      } else if (current === true) {
        // granted → denied
        await api.post(`/users/by-uuid/${uuid}/permissions/override`, {
          permission_id: perm.permission_id,
          granted: false,
        })
      } else {
        // denied → remove override
        await api.delete(`/users/by-uuid/${uuid}/permissions/override/${perm.permission_id}`)
      }
      await loadUser()
    } catch (err: any) {
      showMessage('error', err.response?.data?.detail || t('common.error'))
    }
  }

  /* ---- Filtered permissions ---- */
  const filteredPerms = user?.resolved_permissions.filter(p => {
    if (!permSearch) return true
    const s = permSearch.toLowerCase()
    return (
      p.code.toLowerCase().includes(s) ||
      (p.label || '').toLowerCase().includes(s) ||
      (p.description || '').toLowerCase().includes(s) ||
      p.feature.toLowerCase().includes(s)
    )
  }) || []

  /* ---- Format date ---- */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '\u2014'
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('user_detail.breadcrumb_users'), path: '/admin/users' }, { label: '...' }]} title={t('user_detail.page_title')}>
        <div className="spinner" />
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('user_detail.breadcrumb_users'), path: '/admin/users' }]} title={t('user_detail.user_not_found')}>
        <div className="unified-card empty-state">
          {t('user_detail.user_not_found')}
        </div>
      </Layout>
    )
  }

  const avatarInitial = user.first_name?.charAt(0).toUpperCase() || '?'

  return (
    <Layout
      breadcrumb={[
        { label: t('common.home'), path: '/' },
        { label: t('user_detail.breadcrumb_users'), path: '/admin/users' },
        { label: `${user.first_name} ${user.last_name}` },
      ]}
      title={`${user.first_name} ${user.last_name}`}
    >
      {message && (
        <div className={`alert-dynamic ${message.type === 'success' ? 'alert-dynamic--success' : 'alert-dynamic--error'}`}>
          {message.text}
        </div>
      )}

      {/* Header card */}
      <div className="unified-card ud-header-card">
        <div className="flex-center-xl">
          <div className="avatar-circle">
            {avatarInitial}
          </div>
          <div className="flex-1">
            <div className="ud-name">{user.first_name} {user.last_name.toUpperCase()}</div>
            <div className="text-gray-500-sm">{user.email}</div>
          </div>
          <div className="ud-badges">
            <span className={`badge ${user.is_active ? 'badge-success' : 'badge-warning'} text-xs`}>
              {user.is_active ? t('common.active') : t('common.inactive')}
            </span>
            {user.is_super_admin && (
              <span className="badge badge-info text-xs">{t('common.admin')}</span>
            )}
            <span className="badge badge-secondary text-xs">
              {user.auth_source}
            </span>
          </div>
        </div>
        <div className="info-row">
          <span>{t('user_detail.last_login')} {formatDate(user.last_login)}</span>
          <span>{t('user_detail.last_activity')} {formatDate(user.last_active)}</span>
          <span>{t('user_detail.created_at')} {formatDate(user.created_at)}</span>
        </div>
      </div>

      {/* Info + Roles side by side */}
      <div className="flex-row-lg section-mb">
        {/* Profile form */}
        <div className="unified-card ud-main-panel">
          <h3 className="title-section mb-16">{t('user_detail.section_info')}</h3>
          <div className="flex-col-lg">
            <label className="text-sm">
              <span className="field-label">{t('user_detail.field_email')}</span>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-styled"
              />
            </label>
            <div className="flex-row">
              <label className="text-sm flex-1">
                <span className="field-label">{t('user_detail.field_first_name')}</span>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="input-styled"
                />
              </label>
              <label className="text-sm flex-1">
                <span className="field-label">{t('user_detail.field_last_name')}</span>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="input-styled"
                />
              </label>
            </div>
            <div className="ud-toggle-row">
              <label className="ud-toggle-label">
                <span className="text-gray-500-sm font-medium">{t('user_detail.field_admin')}</span>
                <label className="toggle">
                  <input type="checkbox" checked={form.is_super_admin} onChange={e => setForm(f => ({ ...f, is_super_admin: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
              </label>
              <label className="ud-toggle-label">
                <span className="text-gray-500-sm font-medium">{t('user_detail.field_active')}</span>
                <label className="toggle">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
              </label>
            </div>
            {can('users.update') && (
              <button className="btn btn-primary ud-save-btn" onClick={handleSaveProfile} disabled={saving}>
                {saving ? t('user_detail.saving') : t('user_detail.save')}
              </button>
            )}
          </div>
        </div>

        {/* Roles */}
        <div className="unified-card ud-side-panel">
          <h3 className="title-section mb-16">{t('user_detail.section_roles')}</h3>
          <div className="flex-col-md">
            {allRoles.map(role => {
              const assigned = user.roles.some(r => r.id === role.id)
              return (
                <label key={role.id} className="ud-role-label">
                  <input
                    type="checkbox"
                    checked={assigned}
                    onChange={() => handleToggleRole(role.id)}
                    className="accent-blue"
                    disabled={!can('users.update')}
                  />
                  <div>
                    <div className="font-medium">{role.name}</div>
                    {role.description && (
                      <div className="text-muted text-xs">{role.description}</div>
                    )}
                  </div>
                </label>
              )
            })}
            {allRoles.length === 0 && (
              <div className="text-muted">{t('user_detail.no_roles')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Permissions table */}
      <div className="unified-card full-width-breakout">
        <div className="section-header flex-between">
          <h3 className="title-section mb-0">{t('user_detail.section_permissions')}</h3>
          <div className="flex-center-xl">
            {/* Legend */}
            <div className="ud-legend">
              <span className="badge-tag badge-tag--purple">U</span>
              <span className="badge-tag badge-tag--blue-outline">R</span>
              <span className="badge-tag badge-tag--green-outline">G</span>
            </div>
            <input
              type="text"
              placeholder={t('common.search')}
              value={permSearch}
              onChange={e => setPermSearch(e.target.value)}
              className="input-filter"
            />
          </div>
        </div>
        <div className="table-container">
          <table className="unified-table">
            <thead>
              <tr>
                <th>{t('user_detail.th_permission')}</th>
                <th>{t('user_detail.th_code')}</th>
                <th>{t('user_detail.th_feature')}</th>
                <th className="text-center">{t('user_detail.th_user')}</th>
                <th className="text-center">{t('user_detail.th_role')}</th>
                <th className="text-center">{t('user_detail.th_global')}</th>
                <th className="text-center">{t('user_detail.th_effective')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPerms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state-sm">
                    {permSearch ? t('user_detail.empty_permissions_search') : t('user_detail.empty_permissions')}
                  </td>
                </tr>
              ) : (
                filteredPerms.map(perm => (
                  <tr key={perm.permission_id} className={perm.effective ? '' : 'opacity-60'}>
                    <td>
                      <div className="font-medium text-sm">{perm.label || perm.code}</div>
                      {perm.description && (
                        <div className="text-muted text-xs">{perm.description}</div>
                      )}
                    </td>
                    <td>
                      <code className="text-gray-500-sm text-xs">{perm.code}</code>
                    </td>
                    <td className="text-muted text-sm">{perm.feature}</td>

                    {/* User override — clickable */}
                    <td className="text-center">
                      <button
                        onClick={() => handlePermissionCycle(perm)}
                        className={`perm-indicator perm-indicator--btn ${perm.user_override === true ? 'perm-indicator--user-granted' : perm.user_override === false ? 'perm-indicator--user-denied' : 'perm-indicator--none'}`}
                        title={perm.user_override === true ? t('user_detail.tooltip_user_granted') : perm.user_override === false ? t('user_detail.tooltip_user_denied') : t('user_detail.tooltip_user_none')}
                        disabled={!can('permissions.manage')}
                      >
                        {perm.user_override === true ? '\u2713' : perm.user_override === false ? '\u2717' : '\u2014'}
                      </button>
                    </td>

                    {/* Role — read only */}
                    <td className="text-center">
                      <span className={`perm-indicator ${perm.role_granted === true ? 'perm-indicator--role-granted' : 'perm-indicator--none'}`}>
                        {perm.role_granted === true ? '\u2713' : '\u2014'}
                      </span>
                    </td>

                    {/* Global — read only */}
                    <td className="text-center">
                      <span className={`perm-indicator ${perm.global_granted === true ? 'perm-indicator--global-granted' : perm.global_granted === false ? 'perm-indicator--global-warning' : 'perm-indicator--none'}`}>
                        {perm.global_granted === true ? '\u2713' : perm.global_granted === false ? '\u2717' : '\u2014'}
                      </span>
                    </td>

                    {/* Effective */}
                    <td className="text-center">
                      <span className={`badge ${perm.effective ? 'badge-success' : 'badge-warning'} text-xs`}>
                        {perm.effective ? t('common.yes') : t('common.no')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
