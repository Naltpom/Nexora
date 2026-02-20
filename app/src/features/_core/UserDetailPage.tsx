import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../core/Layout'
import api from '../../api'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface RoleBasic {
  id: number
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
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()

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
      showMessage('error', 'Erreur lors du chargement')
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
      showMessage('success', 'Profil mis a jour')
      await loadUser()
    } catch (err: any) {
      showMessage('error', err.response?.data?.detail || 'Erreur')
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
      showMessage('error', err.response?.data?.detail || 'Erreur')
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
      showMessage('error', err.response?.data?.detail || 'Erreur')
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
      <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Utilisateurs', path: '/admin/users' }, { label: '...' }]} title="Utilisateur">
        <div className="spinner" />
      </Layout>
    )
  }

  if (!user) {
    return (
      <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Utilisateurs', path: '/admin/users' }]} title="Utilisateur introuvable">
        <div className="unified-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--gray-400)' }}>
          Utilisateur introuvable
        </div>
      </Layout>
    )
  }

  const avatarInitial = user.first_name?.charAt(0).toUpperCase() || '?'

  return (
    <Layout
      breadcrumb={[
        { label: 'Accueil', path: '/' },
        { label: 'Utilisateurs', path: '/admin/users' },
        { label: `${user.first_name} ${user.last_name}` },
      ]}
      title={`${user.first_name} ${user.last_name}`}
    >
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

      {/* Header card */}
      <div className="unified-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', backgroundColor: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0,
          }}>
            {avatarInitial}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{user.first_name} {user.last_name.toUpperCase()}</div>
            <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{user.email}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`badge ${user.is_active ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 11 }}>
              {user.is_active ? 'Actif' : 'Inactif'}
            </span>
            {user.is_super_admin && (
              <span className="badge badge-info" style={{ fontSize: 11 }}>Admin</span>
            )}
            <span className="badge badge-secondary" style={{ fontSize: 11 }}>
              {user.auth_source}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: 12, color: 'var(--gray-400)' }}>
          <span>Derniere connexion : {formatDate(user.last_login)}</span>
          <span>Derniere activite : {formatDate(user.last_active)}</span>
          <span>Cree le : {formatDate(user.created_at)}</span>
        </div>
      </div>

      {/* Info + Roles side by side */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        {/* Profile form */}
        <div className="unified-card" style={{ flex: '1 1 0', padding: '20px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Informations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: 13 }}>
              <span style={{ display: 'block', fontWeight: 500, marginBottom: 4, color: 'var(--gray-500)' }}>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)', color: 'var(--text-primary)' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ fontSize: 13, flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 500, marginBottom: 4, color: 'var(--gray-500)' }}>Prenom</span>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)', color: 'var(--text-primary)' }}
                />
              </label>
              <label style={{ fontSize: 13, flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 500, marginBottom: 4, color: 'var(--gray-500)' }}>Nom</span>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>Admin</span>
                <label className="toggle">
                  <input type="checkbox" checked={form.is_super_admin} onChange={e => setForm(f => ({ ...f, is_super_admin: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--gray-500)', fontWeight: 500 }}>Actif</span>
                <label className="toggle">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                  <span className="toggle-slider" />
                </label>
              </label>
            </div>
            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ alignSelf: 'flex-start', fontSize: 13 }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Roles */}
        <div className="unified-card" style={{ flex: '0 0 280px', padding: '20px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Roles</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allRoles.map(role => {
              const assigned = user.roles.some(r => r.id === role.id)
              return (
                <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={assigned}
                    onChange={() => handleToggleRole(role.id)}
                    style={{ accentColor: '#3B82F6' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>{role.name}</div>
                    {role.description && (
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{role.description}</div>
                    )}
                  </div>
                </label>
              )
            })}
            {allRoles.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Aucun role disponible</div>
            )}
          </div>
        </div>
      </div>

      {/* Permissions table */}
      <div className="unified-card full-width-breakout">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Permissions</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
              <span style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: '#7C3AED', color: '#fff' }}>U</span>
              <span style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #3B82F6', color: '#3B82F6' }}>R</span>
              <span style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #059669', color: '#059669' }}>G</span>
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              value={permSearch}
              onChange={e => setPermSearch(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 13, border: '1px solid var(--gray-200)', borderRadius: 8, background: 'var(--gray-50)', color: 'var(--text-primary)', maxWidth: 240 }}
            />
          </div>
        </div>
        <div className="table-container">
          <table className="unified-table">
            <thead>
              <tr>
                <th>Permission</th>
                <th>Code</th>
                <th>Feature</th>
                <th style={{ textAlign: 'center' }}>User</th>
                <th style={{ textAlign: 'center' }}>Role</th>
                <th style={{ textAlign: 'center' }}>Global</th>
                <th style={{ textAlign: 'center' }}>Effectif</th>
              </tr>
            </thead>
            <tbody>
              {filteredPerms.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
                    {permSearch ? 'Aucune permission correspondante' : 'Aucune permission'}
                  </td>
                </tr>
              ) : (
                filteredPerms.map(perm => (
                  <tr key={perm.permission_id} style={{ opacity: perm.effective ? 1 : 0.6 }}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{perm.label || perm.code}</div>
                      {perm.description && (
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{perm.description}</div>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: 11, color: 'var(--gray-500)' }}>{perm.code}</code>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{perm.feature}</td>

                    {/* User override — clickable */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handlePermissionCycle(perm)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 24, borderRadius: 4, border: 'none', cursor: 'pointer',
                          fontSize: 12, fontWeight: 600,
                          ...(perm.user_override === true
                            ? { backgroundColor: '#7C3AED', color: '#fff' }
                            : perm.user_override === false
                            ? { backgroundColor: '#DC2626', color: '#fff' }
                            : { backgroundColor: 'var(--gray-100)', color: 'var(--gray-400)' }),
                        }}
                        title={perm.user_override === true ? 'Autorise (clic: bloquer)' : perm.user_override === false ? 'Bloque (clic: retirer)' : 'Non defini (clic: autoriser)'}
                      >
                        {perm.user_override === true ? '\u2713' : perm.user_override === false ? '\u2717' : '\u2014'}
                      </button>
                    </td>

                    {/* Role — read only */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 24, borderRadius: 4, fontSize: 12, fontWeight: 600,
                        ...(perm.role_granted === true
                          ? { border: '2px solid #3B82F6', color: '#3B82F6', backgroundColor: 'transparent' }
                          : { backgroundColor: 'var(--gray-100)', color: 'var(--gray-400)', border: 'none' }),
                      }}>
                        {perm.role_granted === true ? '\u2713' : '\u2014'}
                      </span>
                    </td>

                    {/* Global — read only */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 24, borderRadius: 4, fontSize: 12, fontWeight: 600,
                        ...(perm.global_granted === true
                          ? { border: '2px solid #059669', color: '#059669', backgroundColor: 'transparent' }
                          : perm.global_granted === false
                          ? { border: '2px solid #D97706', color: '#D97706', backgroundColor: 'transparent' }
                          : { backgroundColor: 'var(--gray-100)', color: 'var(--gray-400)', border: 'none' }),
                      }}>
                        {perm.global_granted === true ? '\u2713' : perm.global_granted === false ? '\u2717' : '\u2014'}
                      </span>
                    </td>

                    {/* Effective */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${perm.effective ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 11 }}>
                        {perm.effective ? 'Oui' : 'Non'}
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
