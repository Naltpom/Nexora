import { useState, useEffect, useCallback, FormEvent } from 'react'
import Layout from '../../core/Layout'
import { useConfirm } from '../../core/ConfirmModal'
import api from '../../api'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Role {
  id: number
  name: string
  description: string
  created_at: string
}

interface Permission {
  id: number
  code: string
  feature: string
  label: string
  description: string
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function RolesAdminPage() {
  const { confirm } = useConfirm()
  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Permission assignment state
  const [showPermModal, setShowPermModal] = useState(false)
  const [permRole, setPermRole] = useState<Role | null>(null)
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [savingPerms, setSavingPerms] = useState(false)

  const loadRoles = useCallback(async (p?: number) => {
    const currentPage = p ?? page
    try {
      const res = await api.get('/roles/', { params: { page: currentPage, per_page: 25 } })
      setRoles(res.data.items)
      setTotal(res.data.total)
      setTotalPages(res.data.pages)
    } catch {
      console.error('Erreur lors du chargement des roles')
    } finally {
      setLoading(false)
    }
  }, [page])

  const loadPermissions = useCallback(async () => {
    try {
      const res = await api.get('/permissions/')
      setAllPermissions(res.data)
    } catch {
      console.error('Erreur lors du chargement des permissions')
    }
  }, [])

  useEffect(() => {
    loadRoles()
    loadPermissions()
  }, [])

  const goToPage = (p: number) => {
    setPage(p)
    loadRoles(p)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // --- Group permissions by feature ---
  const permissionsByFeature = allPermissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.feature]) acc[perm.feature] = []
    acc[perm.feature].push(perm)
    return acc
  }, {})

  // --- Create / Edit ---
  const openCreate = () => {
    setEditingRole(null)
    setForm({ name: '', description: '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (role: Role) => {
    setEditingRole(role)
    setForm({ name: role.name, description: role.description })
    setFormError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, form)
      } else {
        await api.post('/roles/', form)
      }
      setShowModal(false)
      loadRoles()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  // --- Delete ---
  const handleDelete = async (role: Role) => {
    const confirmed = await confirm({
      title: 'Supprimer le role',
      message: `Etes-vous sur de vouloir supprimer le role "${role.name}" ?`,
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      await api.delete(`/roles/${role.id}`)
      loadRoles()
    } catch (err: any) {
      console.error(err.response?.data?.detail || 'Erreur lors de la suppression')
    }
  }

  // --- Permission assignment ---
  const openPermissions = async (role: Role) => {
    setPermRole(role)
    setShowPermModal(true)
    try {
      const res = await api.get(`/roles/${role.id}/permissions`)
      setRolePermissions(res.data)
    } catch {
      setRolePermissions([])
    }
  }

  const togglePermission = (code: string) => {
    setRolePermissions(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  const savePermissions = async () => {
    if (!permRole) return
    setSavingPerms(true)
    try {
      await api.put(`/roles/${permRole.id}/permissions`, { permission_codes: rolePermissions })
      setShowPermModal(false)
      setPermRole(null)
    } catch {
      console.error('Erreur lors de la sauvegarde des permissions')
    } finally {
      setSavingPerms(false)
    }
  }

  // --- Count permissions for a role (displayed inline) ---
  const [permCounts, setPermCounts] = useState<Record<number, number>>({})

  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<number, number> = {}
      for (const role of roles) {
        try {
          const res = await api.get(`/roles/${role.id}/permissions`)
          counts[role.id] = res.data.length
        } catch {
          counts[role.id] = 0
        }
      }
      setPermCounts(counts)
    }
    if (roles.length > 0) loadCounts()
  }, [roles])

  return (
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Roles' }]} title="Roles">
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Gestion des roles</h1>
            <p>Creez et gerez les roles et leurs permissions</p>
          </div>
          <div className="unified-page-header-actions">
            <button className="btn-unified-primary" onClick={openCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nouveau role
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="unified-card full-width-breakout card-table">
            <div className="table-container">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Description</th>
                    <th>Permissions</th>
                    <th>Date creation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                        Aucun role trouve
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <tr key={role.id}>
                        <td><strong>{role.name}</strong></td>
                        <td style={{ color: 'var(--gray-500)' }}>{role.description || '\u2014'}</td>
                        <td>
                          <span
                            className="badge badge-info"
                            style={{ cursor: 'pointer' }}
                            onClick={() => openPermissions(role)}
                            title="Gerer les permissions"
                          >
                            {permCounts[role.id] !== undefined ? permCounts[role.id] : '...'} permission{(permCounts[role.id] ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                          {formatDate(role.created_at)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn-icon btn-icon-primary"
                              onClick={() => openPermissions(role)}
                              title="Gerer les permissions"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                              </svg>
                            </button>
                            <button
                              className="btn-icon btn-icon-primary"
                              onClick={() => openEdit(role)}
                              title="Modifier"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              className="btn-icon btn-icon-danger"
                              onClick={() => handleDelete(role)}
                              title="Supprimer"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="unified-pagination">
            <span className="unified-pagination-info">{total} role{total > 1 ? 's' : ''}</span>
            <div className="unified-pagination-controls">
              {totalPages > 1 && (
                <>
                  <button
                    className="unified-pagination-btn"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc: (number | string)[], p, idx, arr) => {
                      if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                        acc.push('...')
                      }
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`dots-${i}`} className="unified-pagination-dots">...</span>
                      ) : (
                        <button
                          key={p}
                          className={`unified-pagination-btn${p === page ? ' active' : ''}`}
                          onClick={() => goToPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    className="unified-pagination-btn"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create / Edit Role Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRole ? 'Modifier le role' : 'Nouveau role'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error">{formError}</div>}
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Ex: Administrateur, Editeur..."
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Description du role..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : editingRole ? 'Modifier' : 'Creer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Assignment Modal */}
      {showPermModal && permRole && (
        <div className="modal-overlay" onClick={() => { setShowPermModal(false); setPermRole(null) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Permissions du role : {permRole.name}</h2>
              <button className="modal-close" onClick={() => { setShowPermModal(false); setPermRole(null) }}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {Object.keys(permissionsByFeature).length === 0 ? (
                <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: '24px' }}>Aucune permission disponible</p>
              ) : (
                Object.entries(permissionsByFeature).map(([feature, perms]) => (
                  <div key={feature} style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--gray-500)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      {feature}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: rolePermissions.includes(perm.code) ? 'var(--primary-bg, #eff6ff)' : 'transparent',
                            border: '1px solid',
                            borderColor: rolePermissions.includes(perm.code) ? 'var(--primary, #1E40AF)20' : 'var(--gray-200)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={rolePermissions.includes(perm.code)}
                            onChange={() => togglePermission(perm.code)}
                            style={{ marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>{perm.label}</div>
                            <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                              <code style={{ fontSize: '11px', backgroundColor: 'var(--gray-100)', padding: '1px 4px', borderRadius: '3px' }}>{perm.code}</code>
                              {perm.description && <span style={{ marginLeft: '8px' }}>{perm.description}</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowPermModal(false); setPermRole(null) }}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={savePermissions} disabled={savingPerms}>
                {savingPerms ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
