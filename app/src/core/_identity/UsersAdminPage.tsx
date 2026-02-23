import { useState, useEffect, useRef, useCallback, FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import { useAuth } from '../../core/AuthContext'
import { useConfirm } from '../../core/ConfirmModal'
import { usePermission } from '../PermissionContext'
import MultiSelect, { MultiSelectOption } from '../../core/MultiSelect'
import api from '../../api'
import './_identity.scss'

interface RoleCompact {
  id: number
  slug: string
  name: string
  color: string | null
}

interface User {
  id: number
  uuid: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  must_change_password: boolean
  last_login: string | null
  last_active: string | null
  roles: RoleCompact[]
  is_impersonation_immune: boolean
}

interface Invitation {
  id: number
  email: string
  invited_by_name: string | null
  created_at: string
  expires_at: string
}

type FieldChanges = Record<string, any>
type PendingChanges = Record<number, FieldChanges>

type UsersTab = 'users' | 'invitations'

export default function Users() {
  const { t } = useTranslation('_identity')
  const navigate = useNavigate()
  const { user: currentUser, startImpersonation } = useAuth()
  const { confirm, alert } = useConfirm()
  const { can, refreshPermissions } = usePermission()

  // Role filter
  const [availableRoles, setAvailableRoles] = useState<MultiSelectOption[]>([])
  const [filterRoleIds, setFilterRoleIds] = useState<string[]>([])

  // Tab state synced with URL
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as UsersTab | null
  const showInvitationsTab = can('invitations.read')
  const initialTab: UsersTab = tabParam === 'invitations' && showInvitationsTab ? 'invitations' : 'users'
  const [activeTab, setActiveTabState] = useState<UsersTab>(initialTab)

  useEffect(() => {
    const urlTab = searchParams.get('tab') as UsersTab | null
    if (urlTab === 'invitations' && showInvitationsTab && activeTab !== 'invitations') setActiveTabState('invitations')
    else if (urlTab === 'users' && activeTab !== 'users') setActiveTabState('users')
  }, [searchParams])

  const setActiveTab = useCallback((tab: UsersTab) => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }, [setSearchParams])

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationsLoading, setInvitationsLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')
  const [inviteSaving, setInviteSaving] = useState(false)

  const loadInvitations = useCallback(async () => {
    setInvitationsLoading(true)
    try {
      const res = await api.get('/identity/invitations')
      setInvitations(res.data || [])
    } catch { /* */ } finally {
      setInvitationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'invitations' && invitations.length === 0 && !invitationsLoading) {
      loadInvitations()
    }
  }, [activeTab])

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteSaving(true)
    setInviteError('')
    try {
      await api.post('/identity/invite', { email: inviteEmail })
      setShowInviteModal(false)
      setInviteEmail('')
      loadInvitations()
    } catch (err: any) {
      setInviteError(err.response?.data?.detail || t('users_admin.inv_error_send'))
    } finally {
      setInviteSaving(false)
    }
  }

  const handleDeleteInvitation = async (id: number) => {
    const confirmed = await confirm({
      title: t('users_admin.inv_confirm_cancel_title'),
      message: t('users_admin.inv_confirm_cancel_message'),
      confirmText: t('users_admin.inv_confirm_cancel_btn'),
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      await api.delete(`/identity/invitations/${id}`)
      loadInvitations()
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || t('common.error'), variant: 'danger' })
    }
  }

  // Users state
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
    must_change_password: false,
  })
  const [createError, setCreateError] = useState('')

  // Load available roles for filter
  useEffect(() => {
    if (can('roles.read')) {
      api.get('/roles/').then(res => {
        setAvailableRoles((res.data || []).map((r: any) => ({
          value: String(r.id),
          label: r.name,
          color: r.color || undefined,
        })))
      }).catch(() => { /* ignore */ })
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (p?: number, s?: string, pp?: number, sb?: string, sd?: string, inactive?: boolean, roles?: string[]) => {
    const currentPage = p ?? page
    const currentSearch = s ?? search
    const currentPerPage = pp ?? perPage
    const currentSortBy = sb ?? sortBy
    const currentSortDir = sd ?? sortDir
    const currentShowInactive = inactive ?? showInactive
    const currentRoleIds = roles ?? filterRoleIds
    try {
      const params: Record<string, any> = {
        page: currentPage,
        per_page: currentPerPage,
        search: currentSearch,
        active_only: !currentShowInactive,
        sort_by: currentSortBy,
        sort_dir: currentSortDir,
      }
      if (currentRoleIds.length > 0) {
        params.role_ids = currentRoleIds.join(',')
      }
      const usersRes = await api.get('/users/', { params })
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

  const handleFilterRolesChange = (values: string[]) => {
    setFilterRoleIds(values)
    setPage(1)
    loadData(1, undefined, undefined, undefined, undefined, undefined, values)
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
          oldDisplay = user.is_active ? t('common.active') : t('common.inactive')
          newDisplay = newVal ? t('common.active') : t('common.inactive')
        }
        items.push({ userId, userName, field, oldValue: oldDisplay, newValue: newDisplay })
      }
    }
    return items
  }

  const fieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      email: t('users_admin.field_label_email'),
      first_name: t('users_admin.field_label_first_name'),
      last_name: t('users_admin.field_label_last_name'),
      is_active: t('users_admin.field_label_status'),
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
      await refreshPermissions()
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || t('users_admin.save_error'), variant: 'danger' })
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
      setCreateError(err.response?.data?.detail || t('common.error'))
    }
  }

  // --- Delete user ---
  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: t('users_admin.confirm_delete_title'),
      message: t('users_admin.confirm_delete_message'),
      confirmText: t('users_admin.confirm_delete_btn'),
      variant: 'danger',
    })
    if (!confirmed) return
    try {
      await api.delete(`/users/${id}`)
      loadData()
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || t('common.error'), variant: 'danger' })
    }
  }

  // --- Reset password ---
  const handleResetPassword = async (user: User) => {
    const confirmed = await confirm({
      title: t('users_admin.confirm_reset_title'),
      message: t('users_admin.confirm_reset_message', { email: user.email }),
      confirmText: t('users_admin.confirm_reset_btn'),
      variant: 'warning',
    })
    if (!confirmed) return
    try {
      const res = await api.post(`/users/${user.id}/reset-password`)
      await alert({
        title: t('common.success'),
        message: res.data.message + (res.data.token ? `\n\nToken: ${res.data.token}` : ''),
      })
    } catch (err: any) {
      await alert({ message: err.response?.data?.detail || t('common.error'), variant: 'danger' })
    }
  }

  // --- Impersonate ---
  const handleImpersonate = async (user: User) => {
    const confirmed = await confirm({
      title: t('users_admin.confirm_impersonate_title'),
      message: t('users_admin.confirm_impersonate_message', { name: `${user.first_name} ${user.last_name}` }),
      confirmText: t('users_admin.confirm_impersonate_btn'),
      variant: 'warning',
    })
    if (!confirmed) return

    try {
      await startImpersonation(user.id)
      navigate('/')
    } catch (error: any) {
      await alert({ message: error.message || t('users_admin.impersonate_error'), variant: 'danger' })
    }
  }

  return (
    <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('users_admin.breadcrumb_users') }]} title={t('users_admin.breadcrumb_users')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('users_admin.page_title')}</h1>
            <p>{t('users_admin.subtitle')}</p>
          </div>
        </div>
      </div>

      {showInvitationsTab && (
        <div className="tab-bar">
          <button
            className={`tab-button ${activeTab === 'users' ? 'tab-button--active' : 'tab-button--inactive'}`}
            onClick={() => setActiveTab('users')}
            type="button"
          >
            {t('users_admin.tab_users')}
          </button>
          <button
            className={`tab-button ${activeTab === 'invitations' ? 'tab-button--active' : 'tab-button--inactive'}`}
            onClick={() => setActiveTab('invitations')}
            type="button"
          >
            {t('users_admin.tab_invitations')}
          </button>
        </div>
      )}

      {activeTab === 'invitations' && showInvitationsTab ? (
        <>
          <div className="unified-card page-header-card">
            <div className="unified-page-header">
              <div className="unified-page-header-info">
                <h2>{t('users_admin.invitations_title')}</h2>
              </div>
              <div className="unified-page-header-actions">
                {can('invitations.create') && (
                  <button className="btn-unified-primary" onClick={() => { setInviteEmail(''); setInviteError(''); setShowInviteModal(true) }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t('users_admin.btn_invite')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {invitationsLoading ? (
            <div className="spinner" />
          ) : (
            <div className="unified-card full-width-breakout card-table">
              <div className="table-container">
                <table className="unified-table invitations-table">
                  <thead>
                    <tr>
                      <th>{t('users_admin.inv_th_email')}</th>
                      <th>{t('users_admin.inv_th_invited_by')}</th>
                      <th>{t('users_admin.inv_th_sent_at')}</th>
                      <th>{t('users_admin.inv_th_expires_at')}</th>
                      <th>{t('users_admin.inv_th_status')}</th>
                      {can('invitations.delete') && <th>{t('users_admin.inv_th_actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.length === 0 ? (
                      <tr><td colSpan={can('invitations.delete') ? 6 : 5} className="text-center text-secondary">{t('users_admin.inv_empty')}</td></tr>
                    ) : invitations.map(inv => {
                      const isExpired = new Date(inv.expires_at) < new Date()
                      return (
                        <tr key={inv.id}>
                          <td>{inv.email}</td>
                          <td>{inv.invited_by_name || '\u2014'}</td>
                          <td className="nowrap">{new Date(inv.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="nowrap">{new Date(inv.expires_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            <span className={`badge-status ${isExpired ? 'badge-status-offline' : 'badge-status-online'}`}>
                              {isExpired ? t('users_admin.inv_status_expired') : t('users_admin.inv_status_pending')}
                            </span>
                          </td>
                          {can('invitations.delete') && (
                            <td>
                              <button
                                className="btn-icon btn-icon-danger"
                                onClick={() => handleDeleteInvitation(inv.id)}
                                title={t('users_admin.inv_tooltip_cancel')}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t('users_admin.inv_modal_title')}</h2>
                  <button className="modal-close" onClick={() => setShowInviteModal(false)}>&times;</button>
                </div>
                <form onSubmit={handleInvite}>
                  <div className="modal-body">
                    {inviteError && <div className="alert alert-error">{inviteError}</div>}
                    <div className="form-group">
                      <label>{t('users_admin.inv_modal_email_label')}</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder={t('users_admin.inv_modal_email_placeholder')}
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={inviteSaving}>
                      {inviteSaving ? t('users_admin.inv_modal_submitting') : t('users_admin.inv_modal_submit')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Users tab header actions */}
          <div className="unified-card page-header-card">
            <div className="unified-page-header">
              <div className="unified-page-header-actions">
                <label className="unified-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={handleToggleInactive}
                  />
                  {t('users_admin.show_inactive')}
                </label>
                {can('roles.read') && availableRoles.length > 0 && (
                  <MultiSelect
                    options={availableRoles}
                    values={filterRoleIds}
                    onChange={handleFilterRolesChange}
                    placeholder={t('users_admin.filter_roles_placeholder')}
                  />
                )}
                <div className="unified-search-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t('common.search')}
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
                {can('users.create') && (
                  <button className="btn-unified-primary" onClick={openCreate}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t('users_admin.btn_new_user')}
                  </button>
                )}
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
                      {t('users_admin.th_email')} {sortBy === 'email' && <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                    </th>
                    <th className="col-name th-sortable" onClick={() => handleSort('first_name')}>
                      {t('users_admin.th_first_name')} {sortBy === 'first_name' && <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                    </th>
                    <th className="col-name th-sortable" onClick={() => handleSort('last_name')}>
                      {t('users_admin.th_last_name')} {sortBy === 'last_name' && <span className="sort-indicator">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                    </th>
                    <th>{t('users_admin.th_roles')}</th>
                    <th>{t('users_admin.th_active')}</th>
                    <th>{t('users_admin.th_last_activity')}</th>
                    <th>{t('users_admin.th_status')}</th>
                    <th>{t('users_admin.th_actions')}</th>
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
                      <td>
                        <div className="flex-row-xs flex-wrap">
                          {u.roles.map(r => (
                            <span
                              key={r.id}
                              className="badge-role"
                              {...(r.color ? { style: { '--role-color': r.color } as React.CSSProperties } : {})}
                            >
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={isFieldModified(u.id, 'is_active') ? 'cell-modified' : ''}>
                        <button
                          className={`badge-active ${getEffectiveValue(u, 'is_active') ? 'badge-active-on' : 'badge-active-off'}`}
                          onClick={() => setFieldChange(u.id, 'is_active', !getEffectiveValue(u, 'is_active'))}
                          disabled={!can('users.update')}
                        >
                          {getEffectiveValue(u, 'is_active') ? t('common.active') : t('common.inactive')}
                        </button>
                      </td>
                      <td className="text-gray-500-sm nowrap">
                        {u.last_active
                          ? new Date(u.last_active).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '\u2014'}
                      </td>
                      <td>
                        {(() => {
                          if (!u.last_active) return <span className="badge-status badge-status-offline">{t('users_admin.status_offline')}</span>
                          const diff = Date.now() - new Date(u.last_active).getTime()
                          if (diff < 5 * 60 * 1000) return <span className="badge-status badge-status-online">{t('users_admin.status_online')}</span>
                          if (diff < 10 * 60 * 1000) return <span className="badge-status badge-status-away">{t('users_admin.status_away')}</span>
                          return <span className="badge-status badge-status-offline">{t('users_admin.status_offline')}</span>
                        })()}
                      </td>
                      <td>
                        <div className="flex-row-xs">
                          {/* Detail button */}
                          <Link
                            to={`/admin/users/${u.uuid}`}
                            className="btn-icon btn-icon-secondary"
                            title={t('users_admin.tooltip_view_detail')}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </Link>

                          {/* Impersonate button - hidden for immune users and self */}
                          {can('impersonation.start') && !u.is_impersonation_immune && u.id !== currentUser?.id ? (
                            <button
                              className="btn-icon btn-icon-primary impersonate-btn"
                              onClick={() => handleImpersonate(u)}
                              title={t('users_admin.tooltip_impersonate')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                              </svg>
                            </button>
                          ) : (
                            <div className="spacer-32" />
                          )}

                          {can('users.update') && (
                            <button
                              className="btn-icon btn-icon-warning"
                              onClick={() => handleResetPassword(u)}
                              title={t('users_admin.tooltip_reset_password')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </button>
                          )}

                          {can('users.delete') && (
                            <button
                              className="btn-icon btn-icon-danger"
                              onClick={() => handleDelete(u.id)}
                              title={t('users_admin.tooltip_delete')}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
          </div>

          <div className="unified-pagination">
            <span className="unified-pagination-info">{total > 1 ? t('users_admin.pagination_count_plural', { count: total }) : t('users_admin.pagination_count', { count: total })}</span>
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
                <option value={10}>{t('users_admin.per_page_10')}</option>
                <option value={25}>{t('users_admin.per_page_25')}</option>
                <option value={50}>{t('users_admin.per_page_50')}</option>
                <option value={100}>{t('users_admin.per_page_100')}</option>
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
                {t('users_admin.changes_bar_text', { count: Object.keys(pendingChanges).length })}
              </span>
              <div className="unified-changes-bar-actions">
                <button className="btn-unified-secondary btn-padded" onClick={cancelChanges}>
                  {t('users_admin.changes_bar_cancel')}
                </button>
                <button className="btn-unified-primary btn-padded" onClick={() => setShowRecapModal(true)}>
                  {t('users_admin.changes_bar_validate')}
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
              <h2>{t('users_admin.modal_create_title')}</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {createError && <div className="alert alert-error">{createError}</div>}
                <div className="form-group">
                  <label>{t('common.email')}</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('users_admin.modal_create_password_label')}</label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('common.first_name')}</label>
                    <input
                      value={createForm.first_name}
                      onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('common.last_name')}</label>
                    <input
                      value={createForm.last_name}
                      onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group flex-row-xl">
                  <label className="flex-center">
                    <input
                      type="checkbox"
                      checked={createForm.must_change_password}
                      onChange={(e) => setCreateForm({ ...createForm, must_change_password: e.target.checked })}
                    />
                    {t('users_admin.modal_create_force_change_pwd')}
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('common.create')}
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
              <h2>{t('users_admin.modal_recap_title')}</h2>
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
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" onClick={saveChanges} disabled={saving}>
                {saving ? t('users_admin.modal_recap_submitting') : t('users_admin.modal_recap_submit')}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </Layout>
  )
}
