import { useState, useEffect, useCallback, useRef, memo, FormEvent, KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import { useConfirm } from '../../core/ConfirmModal'
import { usePermission } from '../PermissionContext'
import { Pagination } from '../../core/pagination'
import api from '../../api'
import './_identity.scss'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Role {
  id: number
  slug: string
  name: string
  description: string
  color: string | null
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
/*  RoleTableRow (memoized)                                           */
/* ------------------------------------------------------------------ */

interface RoleTableRowProps {
  role: Role
  isPermsMode: boolean
  permsRoleId: number | undefined
  canUpdate: boolean
  canDelete: boolean
  openPerms: (role: Role) => void
  openEdit: (role: Role) => void
  handleDelete: (role: Role) => void
  closePerms: () => void
  handleRoleRowKeyDown: (e: KeyboardEvent, role: Role) => void
  formatDate: (iso: string) => string
  t: (key: string, options?: Record<string, unknown>) => string
}

const RoleTableRow = memo(function RoleTableRow({
  role,
  isPermsMode,
  permsRoleId,
  canUpdate,
  canDelete,
  openPerms,
  openEdit,
  handleDelete,
  closePerms,
  handleRoleRowKeyDown,
  formatDate,
  t,
}: RoleTableRowProps) {
  const isSelected = permsRoleId === role.id

  return (
    <tr
      className={[isSelected ? 'role-row--selected' : '', isPermsMode ? 'role-row--clickable' : ''].filter(Boolean).join(' ') || undefined}
      onClick={isPermsMode ? () => openPerms(role) : undefined}
      onKeyDown={isPermsMode ? (e) => handleRoleRowKeyDown(e, role) : undefined}
      tabIndex={isPermsMode ? 0 : undefined}
      role={isPermsMode ? 'button' : undefined}
      aria-current={isPermsMode && isSelected ? true : undefined}
    >
      <td>
        <span
          className="badge-role"
          {...(role.color ? { style: { '--role-color': role.color } as React.CSSProperties } : {})}
        >
          {role.name}
        </span>
      </td>

      {!isPermsMode && (
        <td className="text-gray-500">{role.description || '\u2014'}</td>
      )}

      {!isPermsMode && (
        <td>
          <span
            className="badge badge-info cursor-pointer"
            onClick={() => openPerms(role)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPerms(role) } }}
            role="button"
            tabIndex={0}
            title={t('roles_admin.tooltip_manage_permissions')}
            aria-label={t('a11y.btn_manage_permissions', { name: role.name })}
          >
            {role.permissions.length !== 1 ? t('roles_admin.badge_permissions_plural', { count: role.permissions.length }) : t('roles_admin.badge_permissions', { count: role.permissions.length })}
          </span>
        </td>
      )}

      {!isPermsMode && (
        <td className="text-gray-500-sm nowrap">
          {formatDate(role.created_at)}
        </td>
      )}

      <td>
        {isPermsMode ? (
          isSelected ? (
            <button
              className="btn-icon btn-icon-secondary"
              onClick={(e) => { e.stopPropagation(); closePerms() }}
              aria-label={t('a11y.btn_back_full_table')}
              title={t('roles_admin.tooltip_back_full_table')}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          ) : null
        ) : (
          <div className="flex-row-xs">
            <button
              className="btn-icon btn-icon-primary"
              onClick={() => openPerms(role)}
              aria-label={t('a11y.btn_manage_permissions', { name: role.name })}
              title={t('roles_admin.tooltip_manage_permissions')}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </button>
            {canUpdate && (
              <button
                className="btn-icon btn-icon-primary"
                onClick={() => openEdit(role)}
                aria-label={t('a11y.btn_edit_role', { name: role.name })}
                title={t('roles_admin.tooltip_edit')}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                className="btn-icon btn-icon-danger"
                onClick={() => handleDelete(role)}
                aria-label={t('a11y.btn_delete_role', { name: role.name })}
                title={t('roles_admin.tooltip_delete')}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
})

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function RolesAdminPage() {
  const { t } = useTranslation('_identity')
  const { confirm } = useConfirm()
  const { can, refreshPermissions } = usePermission()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state (create / edit role)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', color: '#6B7280' })
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

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }, [])

  /* ---------------------------------------------------------------- */
  /*  Create / Edit role                                              */
  /* ---------------------------------------------------------------- */

  const slugify = (name: string) =>
    name.toLowerCase().trim()
      .replace(/[àâä]/g, 'a').replace(/[éèêë]/g, 'e')
      .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
      .replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  const openCreate = () => {
    setEditingRole(null)
    setForm({ name: '', slug: '', description: '', color: '#6B7280' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = useCallback((role: Role) => {
    setEditingRole(role)
    setForm({ name: role.name, slug: role.slug, description: role.description, color: role.color || '#6B7280' })
    setFormError('')
    setShowModal(true)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, { name: form.name, description: form.description, color: form.color })
      } else {
        await api.post('/roles/', { name: form.name, slug: form.slug || undefined, description: form.description, color: form.color })
      }
      setShowModal(false)
      loadRoles()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Delete                                                          */
  /* ---------------------------------------------------------------- */

  const handleDelete = useCallback(async (role: Role) => {
    const confirmed = await confirm({
      title: t('roles_admin.confirm_delete_title'),
      message: t('roles_admin.confirm_delete_message', { name: role.name }),
      confirmText: t('roles_admin.confirm_delete_btn'),
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
  }, [confirm, t, permsRole?.id, loadRoles])

  /* ---------------------------------------------------------------- */
  /*  Permission panel                                                */
  /* ---------------------------------------------------------------- */

  const openPerms = useCallback((role: Role) => {
    setPermsRole(role)
    setPermsSearch('')
    setPermsPage(1)
    loadPerms(role.id, 1, '', permsPerPage)
  }, [loadPerms, permsPerPage])

  const closePerms = useCallback(() => {
    setPermsRole(null)
    setPerms([])
    setPermsSearch('')
    setPermsPage(1)
  }, [])

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
      await refreshPermissions()
    } catch {
      console.error('Erreur lors du toggle de la permission')
    } finally {
      setTogglingPermId(null)
    }
  }

  // Close modal on Escape
  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showModal])

  // Keyboard handler for clickable role rows
  const handleRoleRowKeyDown = useCallback((e: KeyboardEvent, role: Role) => {
    if ((e.key === 'Enter' || e.key === ' ') && isPermsMode) {
      e.preventDefault()
      openPerms(role)
    }
  }, [isPermsMode, openPerms])

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('roles_admin.breadcrumb_roles') }]} title={t('roles_admin.breadcrumb_roles')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('roles_admin.page_title')}</h1>
            <p>{t('roles_admin.subtitle')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{roles.length}</span>
              <span className="page-header-stat-label">{t('stat_roles')}</span>
            </div>
          </div>
          <div className="unified-page-header-actions">
            {can('roles.create') && (
              <button className="btn-unified-primary" onClick={openCreate}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t('roles_admin.btn_new_role')}
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" role="status" aria-label={t('a11y.loading_roles')} />
      ) : (
        <div className={isPermsMode ? 'flex-row-lg' : ''}>
          {/* ---- Roles table ---- */}
          <div
            className={`unified-card card-table${isPermsMode ? ' roles-table-narrow' : ' full-width-breakout'}`}
          >
            <div className="table-container">
              <table className="unified-table">
                <caption className="sr-only">{t('a11y.table_caption_roles')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('roles_admin.th_name')}</th>
                    {!isPermsMode && <th scope="col">{t('roles_admin.th_description')}</th>}
                    {!isPermsMode && <th scope="col">{t('roles_admin.th_permissions')}</th>}
                    {!isPermsMode && <th scope="col">{t('roles_admin.th_created_at')}</th>}
                    <th scope="col">{isPermsMode ? '' : t('roles_admin.th_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan={isPermsMode ? 2 : 5} className="empty-state-sm">
                        {t('roles_admin.empty_state')}
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <RoleTableRow
                        key={role.id}
                        role={role}
                        isPermsMode={isPermsMode}
                        permsRoleId={permsRole?.id}
                        canUpdate={can('roles.update')}
                        canDelete={can('roles.delete')}
                        openPerms={openPerms}
                        openEdit={openEdit}
                        handleDelete={handleDelete}
                        closePerms={closePerms}
                        handleRoleRowKeyDown={handleRoleRowKeyDown}
                        formatDate={formatDate}
                        t={t}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---- Permissions panel ---- */}
          {isPermsMode && permsRole && (
            <div
              className="unified-card perms-panel-flex"
              role="region"
              aria-label={t('roles_admin.perms_panel_title', { name: permsRole.name })}
            >
              {/* Panel header */}
              <div className="section-header">
                <div className="perms-panel-header">
                  <div>
                    <h2 className="title-section-lg">
                      {t('roles_admin.perms_panel_title', { name: permsRole.name })}
                    </h2>
                    <span className="text-muted-sm">
                      {t('roles_admin.perms_panel_active_count', { granted: permsGrantedCount, total: permsTotal })}
                    </span>
                  </div>
                  <button
                    className="btn-icon btn-icon-secondary"
                    onClick={closePerms}
                    aria-label={t('a11y.btn_close_permissions_panel')}
                    title={t('roles_admin.tooltip_close')}
                  >
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div role="search">
                  <input
                    type="text"
                    placeholder={t('roles_admin.perms_search_placeholder')}
                    value={permsSearch}
                    onChange={(e) => handlePermsSearch(e.target.value)}
                    className="input-styled"
                    aria-label={t('a11y.search_role_permissions')}
                  />
                </div>
              </div>

              {/* Permissions table */}
              <div className="table-container" aria-busy={permsLoading}>
                {permsLoading ? (
                  <div className="perms-panel-spinner">
                    <div className="spinner" role="status" aria-label={t('a11y.loading_permissions')} />
                  </div>
                ) : (
                  <table className="unified-table">
                    <caption className="sr-only">{t('a11y.table_caption_role_permissions', { name: permsRole.name })}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{t('roles_admin.perms_th_name')}</th>
                        <th scope="col">{t('roles_admin.perms_th_slug')}</th>
                        <th scope="col">{t('roles_admin.perms_th_description')}</th>
                        <th scope="col" className="text-center">{t('roles_admin.perms_th_active')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perms.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty-state-sm">
                            {t('roles_admin.perms_empty')}
                          </td>
                        </tr>
                      ) : (
                        perms.map((perm) => (
                          <tr key={perm.id}>
                            <td className="font-medium-sm">
                              {perm.label || perm.code}
                            </td>
                            <td>
                              <code className="badge-tag badge-tag--gray">
                                {perm.code}
                              </code>
                            </td>
                            <td className="text-gray-500-sm">
                              {perm.description || '\u2014'}
                            </td>
                            <td className="text-center">
                              <label className={`toggle${togglingPermId === perm.id ? ' toggle--loading' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={perm.granted}
                                  onChange={() => handleTogglePerm(perm)}
                                  disabled={togglingPermId === perm.id || !can('roles.update')}
                                  aria-label={t('a11y.toggle_permission', { name: perm.label || perm.code })}
                                />
                                <span className="toggle-slider" aria-hidden="true" />
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
                <div className="section-padding-h">
                  <Pagination
                    page={permsPage}
                    totalPages={permsTotalPages}
                    total={permsTotal}
                    perPage={permsPerPage}
                    perPageOptions={[10, 20, 50]}
                    countDisplay={permsTotal !== 1 ? t('roles_admin.badge_permissions_plural', { count: permsTotal }) : t('roles_admin.badge_permissions', { count: permsTotal })}
                    onPageChange={handlePermsPageChange}
                    onPerPageChange={handlePermsPerPageChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="role-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="role-modal-title">{editingRole ? t('roles_admin.modal_edit_title') : t('roles_admin.modal_create_title')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label={t('a11y.close_modal')}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && <div className="alert alert-error" role="alert">{formError}</div>}
                <div className="form-group">
                  <label htmlFor="role-name">{t('roles_admin.modal_name_label')}</label>
                  <input
                    id="role-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      const update: typeof form = { ...form, name: newName }
                      if (!editingRole) update.slug = slugify(newName)
                      setForm(update)
                    }}
                    required
                    aria-required="true"
                    placeholder={t('roles_admin.modal_name_placeholder')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role-slug">{t('roles_admin.modal_slug_label')}</label>
                  <input
                    id="role-slug"
                    type="text"
                    value={form.slug}
                    onChange={(e) => !editingRole && setForm({ ...form, slug: e.target.value })}
                    readOnly={!!editingRole}
                    placeholder={t('roles_admin.modal_slug_placeholder')}
                    className={editingRole ? 'input-readonly' : ''}
                    aria-readonly={!!editingRole}
                  />
                  {!editingRole && (
                    <span className="form-hint" id="role-slug-hint">{t('roles_admin.modal_slug_hint')}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="role-description">{t('roles_admin.modal_description_label')}</label>
                  <textarea
                    id="role-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder={t('roles_admin.modal_description_placeholder')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="role-color">{t('roles_admin.modal_color_label')}</label>
                  <div className="color-picker-row">
                    <input
                      id="role-color"
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                    />
                    <span
                      className="badge-role"
                      aria-hidden="true"
                      {...(form.color ? { style: { '--role-color': form.color } as React.CSSProperties } : {})}
                    >
                      {form.name || 'Preview'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('roles_admin.modal_submitting') : editingRole ? t('roles_admin.modal_submit_edit') : t('roles_admin.modal_submit_create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
