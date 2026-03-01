import { useState, useEffect, useCallback, FormEvent, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../Layout'
import { useConfirm } from '../ConfirmModal'
import { Pagination } from '../pagination'
import MultiSelect, { type MultiSelectOption } from '../MultiSelect'
import api from '../../api'
import './announcement.scss'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

interface AnnouncementAdmin {
  id: number
  title: string
  body: string | null
  type: string
  display: string
  requires_acknowledgment: boolean
  target_roles: string[] | null
  start_date: string
  end_date: string | null
  is_dismissible: boolean
  priority: number
  is_active: boolean
  created_by_id: number | null
  created_by_name: string | null
  acknowledged_count: number
  target_count: number
  created_at: string
  updated_at: string
}

interface AckDetail {
  user_id: number
  first_name: string
  last_name: string
  email: string
  acknowledged_at: string
}

interface FormData {
  title: string
  body: string
  type: string
  display: string
  requires_acknowledgment: boolean
  target_roles: string[]
  start_date: string
  end_date: string
  priority: number
  is_dismissible: boolean
  is_active: boolean
}

const DEFAULT_FORM: FormData = {
  title: '',
  body: '',
  type: 'info',
  display: 'banner',
  requires_acknowledgment: false,
  target_roles: [],
  start_date: new Date().toISOString().slice(0, 16),
  end_date: '',
  priority: 0,
  is_dismissible: true,
  is_active: true,
}

const TYPE_OPTIONS = ['info', 'warning', 'success', 'danger'] as const

export default function AnnouncementAdminPage() {
  const { t } = useTranslation('announcement')
  const { confirm } = useConfirm()

  const [items, setItems] = useState<AnnouncementAdmin[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [roleOptions, setRoleOptions] = useState<MultiSelectOption[]>([])

  const [ackModalOpen, setAckModalOpen] = useState(false)
  const [ackDetails, setAckDetails] = useState<AckDetail[]>([])
  const [ackAnnTitle, setAckAnnTitle] = useState('')

  useEffect(() => {
    api.get('/roles/').then(res => {
      setRoleOptions((res.data || []).map((r: { slug: string; name: string; color: string | null }) => ({
        value: r.slug,
        label: r.name,
        color: r.color || undefined,
      })))
    }).catch(() => { /* ignore */ })
  }, [])

  const loadData = useCallback(async (p?: number, s?: string, pp?: number) => {
    try {
      const res = await api.get('/announcements/', {
        params: { page: p ?? page, per_page: pp ?? perPage, search: s ?? search },
      })
      setItems(res.data.items)
      setTotalPages(res.data.pages)
      setTotal(res.data.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, perPage, search])

  useEffect(() => { loadData() }, [loadData])

  const goToPage = (p: number) => {
    setPage(p)
    loadData(p)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    setPage(1)
    loadData(1, value)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setModalOpen(true)
  }

  const openEdit = (ann: AnnouncementAdmin) => {
    setEditingId(ann.id)
    setForm({
      title: ann.title,
      body: ann.body || '',
      type: ann.type,
      display: ann.display,
      requires_acknowledgment: ann.requires_acknowledgment,
      target_roles: ann.target_roles || [],
      start_date: ann.start_date.slice(0, 16),
      end_date: ann.end_date ? ann.end_date.slice(0, 16) : '',
      priority: ann.priority,
      is_dismissible: ann.is_dismissible,
      is_active: ann.is_active,
    })
    setModalOpen(true)
  }

  const cleanBody = (html: string): string | null => {
    if (!html) return null
    // Keep body if it contains text OR meaningful tags (img, etc.)
    const stripped = html.replace(/<[^>]*>/g, '').trim()
    if (stripped) return html
    // Check for non-empty content tags (images, iframes, etc.)
    if (/<img\s/i.test(html)) return html
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      title: form.title,
      body: cleanBody(form.body),
      type: form.type,
      display: form.display,
      requires_acknowledgment: form.display === 'modal' ? form.requires_acknowledgment : false,
      target_roles: form.target_roles.length > 0 ? form.target_roles : null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      priority: form.priority,
      is_dismissible: form.display === 'banner' ? form.is_dismissible : true,
      is_active: form.is_active,
    }

    try {
      if (editingId) {
        await api.put(`/announcements/${editingId}`, payload)
      } else {
        await api.post('/announcements/', payload)
      }
      setModalOpen(false)
      loadData()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (ann: AnnouncementAdmin) => {
    const ok = await confirm({
      message: t('confirm_delete'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/announcements/${ann.id}`)
      loadData()
    } catch {
      // ignore
    }
  }

  const openAckDetails = async (ann: AnnouncementAdmin) => {
    try {
      const res = await api.get(`/announcements/${ann.id}/acknowledgments`)
      setAckDetails(res.data)
      setAckAnnTitle(ann.title)
      setAckModalOpen(true)
    } catch {
      // ignore
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const displayBadge = (ann: AnnouncementAdmin) => {
    if (ann.display === 'modal' && ann.requires_acknowledgment) {
      return <span className="announcement-display-badge mandatory">{t('display_mandatory')}</span>
    }
    if (ann.display === 'modal') {
      return <span className="announcement-display-badge modal">{t('display_modal')}</span>
    }
    return <span className="announcement-display-badge banner">{t('display_banner')}</span>
  }

  const breadcrumb = [
    { label: t('breadcrumb_home'), path: '/' },
    { label: t('breadcrumb_announcements') },
  ]

  return (
    <Layout breadcrumb={breadcrumb} title={t('admin_title')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('admin_title')}</h1>
            <p>{t('admin_subtitle')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{total}</span>
              <span className="page-header-stat-label">{t('stat_annonces')}</span>
            </div>
          </div>
          <div className="unified-page-header-actions">
            <button className="btn-unified-primary" onClick={openCreate}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('admin_btn_create')}
            </button>
          </div>
        </div>
      </div>

      <div className="unified-card">
        <div className="announcement-toolbar">
          <input
            type="text"
            className="announcement-search-input"
            placeholder={t('admin_search_placeholder')}
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="announcement-admin-empty" aria-label={t('aria_loading')}>{t('aria_loading')}</div>
        ) : items.length === 0 ? (
          <div className="announcement-admin-empty">{t('admin_empty')}</div>
        ) : (
          <div className="table-container">
          <table className="unified-table" aria-label={t('aria_table')}>
            <thead>
              <tr>
                <th>{t('col_title')}</th>
                <th>{t('col_mode')}</th>
                <th>{t('col_type')}</th>
                <th>{t('col_target')}</th>
                <th>{t('col_ack')}</th>
                <th>{t('col_start')}</th>
                <th>{t('col_end')}</th>
                <th>{t('col_active')}</th>
                <th>{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(ann => (
                <tr key={ann.id}>
                  <td>
                    <span className="announcement-title-cell">{ann.title}</span>
                  </td>
                  <td>{displayBadge(ann)}</td>
                  <td>
                    <span className={`announcement-type-badge ${ann.type}`}>
                      {t(`type_${ann.type}`)}
                    </span>
                  </td>
                  <td>
                    {ann.target_roles && ann.target_roles.length > 0 ? (
                      <div className="announcement-role-tags">
                        {ann.target_roles.map(slug => {
                          const role = roleOptions.find(r => r.value === slug)
                          return (
                            <span key={slug} className="announcement-role-tag">{role ? role.label : slug}</span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className="text-secondary">{t('target_all')}</span>
                    )}
                  </td>
                  <td>
                    {ann.display === 'modal' ? (
                      <button
                        className="announcement-ack-link"
                        onClick={() => openAckDetails(ann)}
                        title={t('ack_details_title')}
                      >
                        {ann.acknowledged_count}/{ann.target_count}
                      </button>
                    ) : (
                      <span className="text-secondary">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="announcement-date-cell">{formatDate(ann.start_date)}</td>
                  <td className="announcement-date-cell">
                    {ann.end_date ? formatDate(ann.end_date) : '\u2014'}
                  </td>
                  <td>
                    <label className="announcement-toggle">
                      <input
                        type="checkbox"
                        checked={ann.is_active}
                        onChange={async () => {
                          try {
                            await api.put(`/announcements/${ann.id}`, { is_active: !ann.is_active })
                            loadData()
                          } catch { /* ignore */ }
                        }}
                      />
                      <span className="announcement-toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <div className="announcement-actions">
                      <button
                        className="btn-icon btn-icon-secondary"
                        onClick={() => openEdit(ann)}
                        title={t('btn_edit')}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDelete(ann)}
                        title={t('btn_delete')}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={perPage}
          onPageChange={goToPage}
          onPerPageChange={pp => { setPerPage(pp); setPage(1); loadData(1, undefined, pp) }}
          itemLabel={t('col_title').toLowerCase()}
        />
      )}

      {modalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal announcement-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? t('modal_edit_title') : t('modal_create_title')}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('field_title')}</label>
                  <input
                    type="text"
                    className="input"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={t('field_title_placeholder')}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('field_body')}</label>
                  <Suspense fallback={<div className="input" />}>
                    <RichTextEditor
                      content={form.body}
                      onChange={html => setForm(f => ({ ...f, body: html }))}
                      placeholder={t('field_body_placeholder')}
                    />
                  </Suspense>
                </div>

                <div className="announcement-form-row">
                  <div className="form-group">
                    <label className="form-label">{t('field_type')}</label>
                    <select
                      className="input"
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    >
                      {TYPE_OPTIONS.map(tp => (
                        <option key={tp} value={tp}>{t(`type_${tp}`)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('field_display')}</label>
                    <select
                      className="input"
                      value={form.display}
                      onChange={e => setForm(f => ({
                        ...f,
                        display: e.target.value,
                        requires_acknowledgment: e.target.value === 'banner' ? false : f.requires_acknowledgment,
                        is_dismissible: e.target.value === 'modal' ? true : f.is_dismissible,
                      }))}
                    >
                      <option value="banner">{t('display_banner')}</option>
                      <option value="modal">{t('display_modal')}</option>
                    </select>
                  </div>
                </div>

                <div className="announcement-form-row">
                  <div className="form-group">
                    <label className="form-label">{t('field_priority')}</label>
                    <input
                      type="number"
                      className="input"
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('field_target_roles')}</label>
                    <MultiSelect
                      options={roleOptions}
                      values={form.target_roles}
                      onChange={values => setForm(f => ({ ...f, target_roles: values }))}
                      placeholder={t('field_target_roles_placeholder')}
                    />
                  </div>
                </div>

                <div className="announcement-form-row">
                  <div className="form-group">
                    <label className="form-label">{t('field_start_date')}</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={form.start_date}
                      onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('field_end_date')}</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={form.end_date}
                      onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="announcement-form-row">
                  {form.display === 'banner' && (
                    <label className="announcement-checkbox-toggle">
                      <input
                        type="checkbox"
                        checked={form.is_dismissible}
                        onChange={e => setForm(f => ({ ...f, is_dismissible: e.target.checked }))}
                      />
                      <span className="announcement-checkbox-label">{t('field_dismissible')}</span>
                    </label>
                  )}

                  {form.display === 'modal' && (
                    <label className="announcement-checkbox-toggle">
                      <input
                        type="checkbox"
                        checked={form.requires_acknowledgment}
                        onChange={e => setForm(f => ({ ...f, requires_acknowledgment: e.target.checked }))}
                      />
                      <span className="announcement-checkbox-label">{t('field_requires_ack')}</span>
                    </label>
                  )}

                  <label className="announcement-checkbox-toggle">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    />
                    <span className="announcement-checkbox-label">{t('field_active')}</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  {t('btn_cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {ackModalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setAckModalOpen(false)}>
          <div className="modal announcement-ack-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('ack_modal_title', { title: ackAnnTitle })}</h3>
              <button className="modal-close" onClick={() => setAckModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              {ackDetails.length === 0 ? (
                <div className="announcement-admin-empty">{t('ack_modal_empty')}</div>
              ) : (
                <div className="table-container">
                <table className="unified-table">
                  <thead>
                    <tr>
                      <th>{t('ack_col_user')}</th>
                      <th>{t('ack_col_email')}</th>
                      <th>{t('ack_col_date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ackDetails.map(ack => (
                      <tr key={ack.user_id}>
                        <td>{ack.first_name} {ack.last_name}</td>
                        <td>{ack.email}</td>
                        <td className="announcement-date-cell">{formatDate(ack.acknowledged_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAckModalOpen(false)}>
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  )
}
