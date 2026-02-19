import { useState, useEffect, useRef, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import { useConfirm } from '../../core/ConfirmModal'
import api from '../../api'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_super_admin: boolean
  must_change_password: boolean
  last_login: string | null
  last_active: string | null
}

type FieldChanges = Record<string, any>
type PendingChanges = Record<number, FieldChanges>

export default function Users() {
  const navigate = useNavigate()
  const { startImpersonation } = useAuth()
  const { confirm, alert } = useConfirm()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({})
  const [userSnapshots, setUserSnapshots] = useState<Record<number, User>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRecapModal, setShowRecapModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Pagination, search, sort & filter
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage, setPerPage] = useState(25)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [sortBy, setSortBy] = useState<'email' | 'first_name' | 'last_name'>('email')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Create form
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_super_admin: false,
    must_change_password: false,
  })
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (p?: number, s?: string, pp?: number, sb?: string, sd?: string, inactive?: boolean) => {
    const currentPage = p ?? page
    const currentSearch = s ?? search
    const currentPerPage = pp ?? perPage
    const currentSortBy = sb ?? sortBy
    const currentSortDir = sd ?? sortDir
    const currentShowInactive = inactive ?? showInactive
    try {
      const usersRes = await api.get('/users/', { params: {
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch,
        active_only: !currentShowInactive,
        sort_by: currentSortBy,
        sort_dir: currentSortDir,
      } })
      setUsers(usersRes.data.items)
      setTotal(usersRes.data.total)
      setTotalPages(usersRes.data.pages)
      // Accumulate snapshots for cross-page change tracking
      setUserSnapshots(prev => {
        const next = { ...prev }
        for (const u of usersRes.data.items) {
          if (!(u.id in next)) {
            next[u.id] = { ...u }
          }
        }
        return next
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setPage(1)
      loadData(1, value)
    }, 300)
  }

  const handleSort = (field: 'email' | 'first_name' | 'last_name') => {
    const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc'
    setSortBy(field)
    setSortDir(newDir)
    setPage(1)
    loadData(1, undefined, undefined, field, newDir)
  }

  const handleToggleInactive = () => {
    const next = !showInactive
    setShowInactive(next)
    setPage(1)
    loadData(1, undefined, undefined, undefined, undefined, next)
  }

  const goToPage = (p: number) => {
    setPage(p)
    loadData(p)
  }

  // --- Change tracking ---
  const getEffectiveValue = (user: User, field: string) => {
    const changes = pendingChanges[user.id]
    if (changes && field in changes) return changes[field]
    return (user as any)[field]
  }

  const setFieldChange = (userId: number, field: string, value: any) => {
    setPendingChanges(prev => {
      const userChanges = { ...(prev[userId] || {}), [field]: value }
      const user = userSnapshots[userId] || users.find(u => u.id === userId)
      if (user && (user as any)[field] === value) {
        delete userChanges[field]
      }
      if (Object.keys(userChanges).length === 0) {
        const { [userId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [userId]: userChanges }
    })
  }

  const isFieldModified = (userId: number, field: string) => {
    return pendingChanges[userId] && field in pendingChanges[userId]
  }

  const hasChanges = Object.keys(pendingChanges).length > 0

  const cancelChanges = () => {
    setPendingChanges({})
    setUserSnapshots({})
  }

  // --- Recap & save ---
  const getRecapItems = () => {
    const items: { userId: number; userName: string; field: string; oldValue: string; newValue: string }[] = []
    for (const [userIdStr, changes] of Object.entries(pendingChanges)) {
      const userId = parseInt(userIdStr)
      const user = userSnapshots[userId] || users.find(u => u.id === userId)
      if (!user) continue
      const userName = `${user.first_name} ${user.last_name}`
      for (const [field, newVal] of Object.entries(changes)) {
        let oldDisplay = String((user as any)[field])
        let newDisplay = String(newVal)
        if (field === 'is_active') {
          oldDisplay = user.is_active ? 'Actif' : 'Inactif'
          newDisplay = newVal ? 'Actif' : 'Inactif'
        } else if (field === 'is_super_admin') {
          oldDisplay = user.is_super_admin ? 'Oui' : 'Non'
          newDisplay = newVal ? 'Oui' : 'Non'
        }
        items.push({ userId, userName, field, oldValue: oldDisplay, newValue: newDisplay })
      }
    }
    return items
  }

  const fieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      email: 'Email',
      first_name: 'Prenom',
      last_name: 'Nom',
      is_active: 'Statut',
      is_super_admin: 'Admin',
    }
    return labels[field] || field
  }

  const saveChanges = async () => {
    setSaving(true)
    try {
      for (const [userIdStr, changes] of Object.entries(pendingChanges)) {
        const userId = parseInt(userIdStr)
        const payload: any = {}
        for (const [field, value] of Object.entries(changes)) {
          payload[field] = value
        }
        await api.put(`/users/${userId}`, payload)
      }
      setPendingChanges({})
      setUserSnapshots({})
      setShowRecapModal(false)
      await loadData()
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || 'Erreur lors de la sauvegarde', variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  // --- Create user ---
  const openCreate = () => {
    setCreateForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      is_super_admin: false,
      must_change_password: false,
    })
    setCreateError('')
    setShowCreateModal(true)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreateError('')
    try {
      await api.post('/users/', {
        ...createForm,
        password: createForm.password || undefined,
      })
      setShowCreateModal(false)
      loadData()
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Erreur')
    }
  }

  // --- Delete user ---
  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'utilisateur',
      message: 'Etes-vous sur de vouloir supprimer cet utilisateur ?',
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      await api.delete(`/users/${id}`)
      loadData()
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || 'Erreur', variant: 'danger' })
    }
  }

  // --- Reset password ---
  const handleResetPassword = async (user: User) => {
    const confirmed = await confirm({
      title: 'Reinitialiser le mot de passe',
      message: `Envoyer un email de reinitialisation du mot de passe a ${user.email} ?`,
      confirmText: 'Envoyer',
      variant: 'warning',
    })
    if (!confirmed) return
    try {
      const res = await api.post(`/users/${user.id}/reset-password`)
      await alert({
        title: 'Succes',
        message: res.data.message + (res.data.token ? `\n\nToken: ${res.data.token}` : ''),
      })
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || 'Erreur', variant: 'danger' })
    }
  }

  // --- Impersonate ---
  const handleImpersonate = async (user: User) => {
    const confirmed = await confirm({
      title: 'Impersonation',
      message: `Se connecter en tant que ${user.first_name} ${user.last_name} ?`,
      confirmText: 'Confirmer',
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      await startImpersonation(user.id)
      navigate('/')
    } catch (error: any) {
      await alert({ message: error.message || "Erreur lors de l'impersonation", variant: 'danger' })
    }
  }

  return (
    <Layout breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Utilisateurs' }]} title="Utilisateurs">
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Gestion des utilisateurs</h1>
            <p>Gerez les comptes et acces des utilisateurs</p>
          </div>
          <div className="unified-page-header-actions">
            <label className="unified-filter-checkbox">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={handleToggleInactive}
              />
              Afficher les inactifs
            </label>
            <div className="unified-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <button className="btn-unified-primary" onClick={openCreate}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nouvel utilisateur
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
                    <th className="col-email th-sortable" onClick={() => handleSort('email')}>
                      Email {sortBy === 'email' && <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                    </th>
                    <th className="col-name th-sortable" onClick={() => handleSort('first_name')}>
                      Prenom {sortBy === 'first_name' && <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                    </th>
                    <th className="col-name th-sortable" onClick={() => handleSort('last_name')}>
                      Nom {sortBy === 'last_name' && <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                    </th>
                    <th>Admin</th>
                    <th>Actif</th>
                    <th>Derniere activite</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className={isFieldModified(u.id, 'email') ? 'cell-modified' : ''}>
                        <input
                          className="inline-input"
                          value={getEffectiveValue(u, 'email')}
                          onChange={(e) => setFieldChange(u.id, 'email', e.target.value)}
                        />
                      </td>
                      <td className={isFieldModified(u.id, 'first_name') ? 'cell-modified' : ''}>
                        <input
                          className="inline-input"
                          value={getEffectiveValue(u, 'first_name')}
                          onChange={(e) => setFieldChange(u.id, 'first_name', e.target.value)}
                        />
                      </td>
                      <td className={isFieldModified(u.id, 'last_name') ? 'cell-modified' : ''}>
                        <input
                          className="inline-input"
                          value={getEffectiveValue(u, 'last_name')}
                          onChange={(e) => setFieldChange(u.id, 'last_name', e.target.value)}
                        />
                      </td>
                      <td className={isFieldModified(u.id, 'is_super_admin') ? 'cell-modified' : ''}>
                        <button
                          className={`badge-admin ${getEffectiveValue(u, 'is_super_admin') ? 'badge-admin-on' : 'badge-admin-off'}`}
                          onClick={() => setFieldChange(u.id, 'is_super_admin', !getEffectiveValue(u, 'is_super_admin'))}
                        >
                          {getEffectiveValue(u, 'is_super_admin') ? 'Admin' : 'Non'}
                        </button>
                      </td>
                      <td className={isFieldModified(u.id, 'is_active') ? 'cell-modified' : ''}>
                        <button
                          className={`badge-active ${getEffectiveValue(u, 'is_active') ? 'badge-active-on' : 'badge-active-off'}`}
                          onClick={() => setFieldChange(u.id, 'is_active', !getEffectiveValue(u, 'is_active'))}
                        >
                          {getEffectiveValue(u, 'is_active') ? 'Actif' : 'Inactif'}
                        </button>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                        {u.last_active
                          ? new Date(u.last_active).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '\u2014'}
                      </td>
                      <td>
                        {(() => {
                          if (!u.last_active) return <span className="badge-status badge-status-offline">Hors ligne</span>
                          const diff = Date.now() - new Date(u.last_active).getTime()
                          if (diff < 5 * 60 * 1000) return <span className="badge-status badge-status-online">En ligne</span>
                          if (diff < 10 * 60 * 1000) return <span className="badge-status badge-status-away">Absent</span>
                          return <span className="badge-status badge-status-offline">Hors ligne</span>
                        })()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* Impersonate button - hidden for super admins */}
                          {!u.is_super_admin ? (
                            <button
                              className="btn-icon btn-icon-primary"
                              onClick={() => handleImpersonate(u)}
                              title="Se connecter en tant que"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            </button>
                          ) : (
                            <div style={{ width: 32, height: 32 }} />
                          )}

                          {/* Reset password button */}
                          <button
                            className="btn-icon btn-icon-warning"
                            onClick={() => handleResetPassword(u)}
                            title="Reset mot de passe"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </button>

                          {/* Delete button */}
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(u.id)}
                            title="Supprimer"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
          </div>

          <div className="unified-pagination">
            <span className="unified-pagination-info">{total} utilisateur{total > 1 ? 's' : ''}</span>
            <div className="unified-pagination-controls">
              <select
                className="per-page-select"
                value={perPage}
                onChange={(e) => {
                  const newPerPage = parseInt(e.target.value)
                  setPerPage(newPerPage)
                  setPage(1)
                  loadData(1, search, newPerPage)
                }}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
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

          {hasChanges && (
            <div className="unified-changes-bar">
              <span className="unified-changes-bar-text">
                <span className="unified-changes-bar-dot" />
                {Object.keys(pendingChanges).length} utilisateur(s) modifie(s)
              </span>
              <div className="unified-changes-bar-actions">
                <button className="btn-unified-secondary" onClick={cancelChanges} style={{ padding: '8px 16px' }}>
                  Annuler
                </button>
                <button className="btn-unified-primary" onClick={() => setShowRecapModal(true)} style={{ padding: '8px 16px' }}>
                  Valider les changements
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nouvel utilisateur</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {createError && <div className="alert alert-error">{createError}</div>}
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mot de passe</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Prenom</label>
                    <input
                      value={createForm.first_name}
                      onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom</label>
                    <input
                      value={createForm.last_name}
                      onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ display: 'flex', gap: 24 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={createForm.is_super_admin}
                      onChange={(e) => setCreateForm({ ...createForm, is_super_admin: e.target.checked })}
                    />
                    Super Admin
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={createForm.must_change_password}
                      onChange={(e) => setCreateForm({ ...createForm, must_change_password: e.target.checked })}
                    />
                    Forcer changement MDP
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Creer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recap Modal */}
      {showRecapModal && (
        <div className="modal-overlay" onClick={() => setShowRecapModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Recapitulatif des changements</h2>
              <button className="modal-close" onClick={() => setShowRecapModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <ul className="recap-list">
                {getRecapItems().map((item, i) => (
                  <li key={i} className="recap-item">
                    <span className="recap-user-name">{item.userName}</span>
                    <span className="recap-field"> — {fieldLabel(item.field)} : </span>
                    <span className="recap-old">{item.oldValue}</span>
                    <span className="recap-arrow">&rarr;</span>
                    <span className="recap-new">{item.newValue}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRecapModal(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
