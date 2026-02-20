import { useState, useEffect, useCallback, useRef, FormEvent } from 'react'
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
  permissions: string[]
  created_at: string
  updated_at: string
}

interface PermissionWithGranted {
  id: number
  code: string
  feature: string
  label: string | null
  description: string | null
  granted: boolean
}

interface PermsPaginated {
  items: PermissionWithGranted[]
  total: number
  page: number
  per_page: number
  pages: number
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function RolesAdminPage() {
  const { confirm } = useConfirm()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state (create / edit role)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Permission panel state
  const [permsRole, setPermsRole] = useState<Role | null>(null)
  const [perms, setPerms] = useState<PermissionWithGranted[]>([])
  const [permsLoading, setPermsLoading] = useState(false)
  const [permsPage, setPermsPage] = useState(1)
  const [permsTotalPages, setPermsTotalPages] = useState(1)
  const [permsTotal, setPermsTotal] = useState(0)
  const [permsPerPage, setPermsPerPage] = useState(20)
  const [permsSearch, setPermsSearch] = useState('')
  const [togglingPermId, setTogglingPermId] = useState<number | null>(null)
  const [permsGrantedCount, setPermsGrantedCount] = useState(0)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isPermsMode = permsRole !== null

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                    */
  /* ---------------------------------------------------------------- */

  const loadRoles = useCallback(async () => {
    try {
      const res = await api.get('/roles/')
      setRoles(res.data)
    } catch {
      console.error('Erreur lors du chargement des roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRoles()
  }, [loadRoles])

  const loadPerms = useCallback(async (roleId: number, page?: number, search?: string, pp?: number) => {
    const p = page ?? permsPage
    const s = search ?? permsSearch
    const perPageVal = pp ?? permsPerPage
    setPermsLoading(true)
    try {
      const res = await api.get(`/roles/${roleId}/permissions/all`, {
        params: { page: p, per_page: perPageVal, search: s || undefined },
      })
      const data: PermsPaginated = res.data
      setPerms(data.items)
      setPermsTotal(data.total)
      setPermsTotalPages(data.pages)
      setPermsPage(data.page)
      // Update granted count from the roles list
      const currentRole = roles.find(r => r.id === roleId)
      if (currentRole) {
        setPermsGrantedCount(currentRole.permissions.length)
      }
    } catch {
      console.error('Erreur lors du chargement des permissions')
    } finally {
      setPermsLoading(false)
    }
  }, [permsPage, permsSearch, permsPerPage, roles])

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                         */
  /* ---------------------------------------------------------------- */

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  /* ---------------------------------------------------------------- */
  /*  Create / Edit role                                              */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Delete                                                          */
  /* ---------------------------------------------------------------- */

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
      if (permsRole?.id === role.id) {
        setPermsRole(null)
      }
      loadRoles()
    } catch (err: any) {
      console.error(err.response?.data?.detail || 'Erreur lors de la suppression')
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Permission panel                                                */
  /* ---------------------------------------------------------------- */

  const openPerms = (role: Role) => {
    setPermsRole(role)
    setPermsSearch('')
    setPermsPage(1)
    loadPerms(role.id, 1, '', permsPerPage)
  }

  const closePerms = () => {
    setPermsRole(null)
    setPerms([])
    setPermsSearch('')
    setPermsPage(1)
  }

  const handlePermsSearch = (value: string) => {
    setPermsSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      if (permsRole) {
        setPermsPage(1)
        loadPerms(permsRole.id, 1, value)
      }
    }, 300)
  }

  const handlePermsPageChange = (p: number) => {
    if (permsRole) {
      setPermsPage(p)
      loadPerms(permsRole.id, p)
    }
  }

  const handlePermsPerPageChange = (pp: number) => {
    setPermsPerPage(pp)
    if (permsRole) {
      setPermsPage(1)
      loadPerms(permsRole.id, 1, permsSearch, pp)
    }
  }

  const handleTogglePerm = async (perm: PermissionWithGranted) => {
    if (!permsRole) return
    setTogglingPermId(perm.id)
    try {
      const res = await api.post(`/roles/${permsRole.id}/permissions/toggle`, {
        permission_id: perm.id,
      })
      const newGranted: boolean = res.data.granted
      // Update local permission state
      setPerms(prev => prev.map(p => p.id === perm.id ? { ...p, granted: newGranted } : p))
      setPermsGrantedCount(prev => newGranted ? prev + 1 : prev - 1)
      // Update role in roles list
      setRoles(prev => prev.map(r => {
        if (r.id !== permsRole.id) return r
        const newPermissions = newGranted
          ? [...r.permissions, perm.code]
          : r.permissions.filter(c => c !== perm.code)
        return { ...r, permissions: newPermissions }
      }))
    } catch {
      console.error('Erreur lors du toggle de la permission')
    } finally {
      setTogglingPermId(null)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Pagination                                                      */
  /* ---------------------------------------------------------------- */

  const renderPagination = () => {
    const pages: (number | '...')[] = []
    for (let i = 1; i <= permsTotalPages; i++) {
      if (i === 1 || i === permsTotalPages || (i >= permsPage - 1 && i <= permsPage + 1)) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }

    return (
      <div className="unified-pagination">
        <div className="unified-pagination-info">
          {permsTotal} permission{permsTotal !== 1 ? 's' : ''}
        </div>
        <div className="unified-pagination-controls">
          <select
            className="per-page-select"
            value={permsPerPage}
            onChange={(e) => handlePermsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button
            className="unified-pagination-btn"
            disabled={permsPage <= 1}
            onClick={() => handlePermsPageChange(permsPage - 1)}
          >
            &laquo;
          </button>
          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="unified-pagination-dots">...</span>
            ) : (
              <button
                key={p}
                className={`unified-pagination-btn ${p === permsPage ? 'active' : ''}`}
                onClick={() => handlePermsPageChange(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            className="unified-pagination-btn"
            disabled={permsPage >= permsTotalPages}
            onClick={() => handlePermsPageChange(permsPage + 1)}
          >
            &raquo;
          </button>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

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
        <div style={isPermsMode ? { display: 'flex', gap: '16px' } : undefined}>
          {/* ---- Roles table ---- */}
          <div
            className={`unified-card card-table${isPermsMode ? '' : ' full-width-breakout'}`}
            style={isPermsMode ? { flex: '0 0 240px', overflow: 'hidden' } : undefined}
          >
            <div className="table-container">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    {!isPermsMode && <th>Description</th>}
                    {!isPermsMode && <th>Permissions</th>}
                    {!isPermsMode && <th>Date creation</th>}
                    <th>{isPermsMode ? '' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan={isPermsMode ? 2 : 5} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                        Aucun role trouve
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <tr
                        key={role.id}
                        style={{
                          backgroundColor: permsRole?.id === role.id ? 'rgba(30, 64, 175, 0.08)' : undefined,
                          cursor: isPermsMode ? 'pointer' : undefined,
                        }}
                        onClick={isPermsMode ? () => openPerms(role) : undefined}
                      >
                        <td><strong>{role.name}</strong></td>

                        {!isPermsMode && (
                          <td style={{ color: 'var(--gray-500)' }}>{role.description || '\u2014'}</td>
                        )}

                        {!isPermsMode && (
                          <td>
                            <span
                              className="badge badge-info"
                              style={{ cursor: 'pointer' }}
                              onClick={() => openPerms(role)}
                              title="Gerer les permissions"
                            >
                              {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                        )}

                        {!isPermsMode && (
                          <td style={{ fontSize: 13, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                            {formatDate(role.created_at)}
                          </td>
                        )}

                        <td>
                          {isPermsMode ? (
                            permsRole?.id === role.id ? (
                              <button
                                className="btn-icon btn-icon-secondary"
                                onClick={(e) => { e.stopPropagation(); closePerms() }}
                                title="Retour au tableau complet"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                              </button>
                            ) : null
                          ) : (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn-icon btn-icon-primary"
                                onClick={() => openPerms(role)}
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
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- Permissions panel ---- */}
          {isPermsMode && permsRole && (
            <div
              className="unified-card"
              style={{ flex: '1 1 auto', overflow: 'hidden' }}
            >
              {/* Panel header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                      Permissions de {permsRole.name}
                    </h2>
                    <span style={{ fontSize: '13px', color: 'var(--gray-400)' }}>
                      {permsGrantedCount} / {permsTotal} actives
                    </span>
                  </div>
                  <button
                    className="btn-icon btn-icon-secondary"
                    onClick={closePerms}
                    title="Fermer"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher une permission..."
                  value={permsSearch}
                  onChange={(e) => handlePermsSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    background: 'var(--gray-50)',
                    color: 'var(--text-primary, var(--gray-700))',
                  }}
                />
              </div>

              {/* Permissions table */}
              <div className="table-container">
                {permsLoading ? (
                  <div style={{ textAlign: 'center', padding: '32px' }}>
                    <div className="spinner" />
                  </div>
                ) : (
                  <table className="unified-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Slug</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'center' }}>Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)' }}>
                            Aucune permission trouvee
                          </td>
                        </tr>
                      ) : (
                        perms.map((perm) => (
                          <tr key={perm.id}>
                            <td style={{ fontWeight: 500, fontSize: '13px' }}>
                              {perm.label || perm.code}
                            </td>
                            <td>
                              <code style={{ fontSize: '11px', color: 'var(--gray-500)', backgroundColor: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px' }}>
                                {perm.code}
                              </code>
                            </td>
                            <td style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
                              {perm.description || '\u2014'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <label className="toggle" style={{ cursor: togglingPermId === perm.id ? 'wait' : 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={perm.granted}
                                  onChange={() => handleTogglePerm(perm)}
                                  disabled={togglingPermId === perm.id}
                                />
                                <span className="toggle-slider" />
                              </label>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {!permsLoading && permsTotal > 0 && (
                <div style={{ padding: '0 20px 12px' }}>
                  {renderPagination()}
                </div>
              )}
            </div>
          )}
        </div>
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
    </Layout>
  )
}
