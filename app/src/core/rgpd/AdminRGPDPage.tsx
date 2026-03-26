import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import Layout from '../Layout'
import { usePermission } from '../PermissionContext'
import api from '../../api'
import './rgpd.scss'

type Tab = 'registre' | 'droits' | 'audit' | 'pages'
const VALID_TABS: Tab[] = ['registre', 'droits', 'audit', 'pages']

interface RegisterEntry {
  id: number
  name: string
  purpose: string
  legal_basis: string
  data_categories: string
  data_subjects: string
  recipients: string | null
  retention_period: string
  security_measures: string | null
  is_active: boolean
  created_at: string
}

interface RightsRequest {
  id: number
  user_email: string | null
  user_name: string | null
  request_type: string
  status: string
  description: string | null
  admin_response: string | null
  created_at: string
}

interface AuditLog {
  id: number
  accessor_email: string | null
  target_user_id: number | null
  target_user_email: string | null
  resource_type: string
  action: string
  details: string | null
  created_at: string
}

interface LegalPageItem {
  id: number
  slug: string
  title: string
  is_published: boolean
  requires_acceptance: boolean
  version: number
  content_html: string
  updated_at: string
}

interface LegalPageVersionItem {
  version: number
  title: string
  content_html: string
  created_at: string
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  access: 'admin_rgpd_page.type_access', rectification: 'admin_rgpd_page.type_rectification', erasure: 'admin_rgpd_page.type_erasure',
  portability: 'admin_rgpd_page.type_portability', opposition: 'admin_rgpd_page.type_opposition', limitation: 'admin_rgpd_page.type_limitation',
}

const STATUS_CLASSNAMES: Record<string, string> = {
  pending: 'rgpd-status-pending',
  processing: 'rgpd-status-processing',
  completed: 'rgpd-status-completed',
  rejected: 'rgpd-status-rejected',
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  pending: 'admin_rgpd_page.status_pending',
  processing: 'admin_rgpd_page.status_processing',
  completed: 'admin_rgpd_page.status_completed',
  rejected: 'admin_rgpd_page.status_rejected',
}

export default function AdminRGPDPage() {
  const { t } = useTranslation('rgpd')
  const { can } = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()

  const tabs: { key: Tab; label: string; permission?: string }[] = [
    { key: 'registre', label: t('admin_rgpd_page.tab_registre'), permission: 'rgpd.registre.read' },
    { key: 'droits', label: t('admin_rgpd_page.tab_droits'), permission: 'rgpd.droits.manage' },
    { key: 'audit', label: t('admin_rgpd_page.tab_audit'), permission: 'rgpd.audit.read' },
    { key: 'pages', label: t('admin_rgpd_page.tab_pages'), permission: 'rgpd.politique.manage' },
  ]

  const visibleTabs = tabs.filter(t => !t.permission || can(t.permission))

  const tabParam = searchParams.get('tab') as Tab | null
  const initialTab = tabParam && VALID_TABS.includes(tabParam) && visibleTabs.find(t => t.key === tabParam)
    ? tabParam : (visibleTabs[0]?.key || 'registre')
  const [activeTab, setActiveTabState] = useState<Tab>(initialTab)

  // Sync tab from URL when searchParams change (tutorial navigation)
  useEffect(() => {
    const urlTab = searchParams.get('tab') as Tab | null
    if (urlTab && VALID_TABS.includes(urlTab) && visibleTabs.find(t => t.key === urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab)
    }
  }, [searchParams])

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(tab)
    setSearchParams({ tab }, { replace: true })
  }, [setSearchParams])

  const handleTabKeyDown = (e: React.KeyboardEvent, tab: Tab) => {
    const currentIndex = visibleTabs.findIndex(t => t.key === tab)
    let nextIndex = -1

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % visibleTabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = visibleTabs.length - 1
    }

    if (nextIndex >= 0) {
      e.preventDefault()
      setActiveTab(visibleTabs[nextIndex].key)
      const el = document.getElementById(`rgpd-tab-${visibleTabs[nextIndex].key}`)
      el?.focus()
    }
  }

  return (
    <Layout
      title={t('admin_rgpd_page.page_title')}
      breadcrumb={[{ label: t('admin_rgpd_page.breadcrumb_home'), path: '/' }, { label: t('admin_rgpd_page.breadcrumb_label') }]}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('admin_rgpd_page.heading')}</h1>
            <p>{t('admin_rgpd_page.description')}</p>
          </div>
        </div>
      </div>

      <div className="rgpd-tabs" role="tablist" aria-label={t('admin_rgpd_page.aria_tablist')}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            id={`rgpd-tab-${tab.key}`}
            className={`rgpd-tab${activeTab === tab.key ? ' rgpd-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(e) => handleTabKeyDown(e, tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`rgpd-tabpanel-${tab.key}`}
            tabIndex={activeTab === tab.key ? 0 : -1}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id={`rgpd-tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`rgpd-tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === 'registre' && <RegisterTab />}
        {activeTab === 'droits' && <RightsTab />}
        {activeTab === 'audit' && <AuditTab />}
        {activeTab === 'pages' && <LegalPagesTab />}
      </div>
    </Layout>
  )
}

/* ---- Register Tab ---- */

function RegisterTab() {
  const { t } = useTranslation('rgpd')
  const { can } = usePermission()
  const [entries, setEntries] = useState<RegisterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', purpose: '', legal_basis: 'consentement', data_categories: '',
    data_subjects: '', recipients: '', retention_period: '', security_measures: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/register/')
      setEntries(res.data.items || [])
    } catch {
      setError(t('admin_register_tab.error_load'))
      setTimeout(() => setError(''), 5000)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({ name: '', purpose: '', legal_basis: 'consentement', data_categories: '', data_subjects: '', recipients: '', retention_period: '', security_measures: '' })
    setEditId(null)
    setShowForm(false)
  }

  const handleEdit = (entry: RegisterEntry) => {
    setForm({
      name: entry.name, purpose: entry.purpose, legal_basis: entry.legal_basis,
      data_categories: entry.data_categories, data_subjects: entry.data_subjects,
      recipients: entry.recipients || '', retention_period: entry.retention_period,
      security_measures: entry.security_measures || '',
    })
    setEditId(entry.id)
    setShowForm(true)
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/rgpd/register/${editId}`, form)
      } else {
        await api.post('/rgpd/register/', form)
      }
      resetForm()
      load()
    } catch {
      setError(t('admin_register_tab.error_save'))
      setTimeout(() => setError(''), 5000)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin_register_tab.confirm_delete'))) return
    try {
      await api.delete(`/rgpd/register/${id}`)
      load()
    } catch {
      setError(t('admin_register_tab.error_delete'))
      setTimeout(() => setError(''), 5000)
    }
  }

  if (loading) return <div className="text-center loading-pad-lg" aria-busy="true"><div className="spinner" role="status"><span className="sr-only">{t('admin_register_tab.aria_loading')}</span></div></div>

  return (
    <div>
      {error && <div className="alert alert-danger mb-16" role="alert">{error}</div>}

      <div className="rgpd-section-header">
        <h2>{t('admin_register_tab.heading')}</h2>
        {can('rgpd.registre.create') && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { resetForm(); setShowForm(true) }}
            aria-expanded={showForm}
            aria-controls="register-form"
          >
            {t('admin_register_tab.btn_add')}
          </button>
        )}
      </div>

      {showForm && (
        <form
          id="register-form"
          className="unified-card rgpd-register-form"
          onSubmit={handleSave}
          aria-label={editId ? t('admin_register_tab.form_title_edit') : t('admin_register_tab.form_title_new')}
        >
          <h3>{editId ? t('admin_register_tab.form_title_edit') : t('admin_register_tab.form_title_new')}</h3>
          <div className="settings-grid">
            <div className="form-group">
              <label htmlFor="register-name">{t('admin_register_tab.label_name')}</label>
              <input id="register-name" type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} aria-required="true" />
            </div>
            <div className="form-group">
              <label htmlFor="register-legal-basis">{t('admin_register_tab.label_legal_basis')}</label>
              <select id="register-legal-basis" value={form.legal_basis} onChange={e => setForm(p => ({ ...p, legal_basis: e.target.value }))} aria-required="true">
                <option value="consentement">{t('admin_register_tab.option_consentement')}</option>
                <option value="contrat">{t('admin_register_tab.option_contrat')}</option>
                <option value="obligation_legale">{t('admin_register_tab.option_obligation_legale')}</option>
                <option value="interet_vital">{t('admin_register_tab.option_interet_vital')}</option>
                <option value="interet_public">{t('admin_register_tab.option_interet_public')}</option>
                <option value="interet_legitime">{t('admin_register_tab.option_interet_legitime')}</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="register-purpose">{t('admin_register_tab.label_purpose')}</label>
              <textarea id="register-purpose" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} rows={2} aria-required="true" />
            </div>
            <div className="form-group">
              <label htmlFor="register-data-categories">{t('admin_register_tab.label_data_categories')}</label>
              <input id="register-data-categories" type="text" value={form.data_categories} onChange={e => setForm(p => ({ ...p, data_categories: e.target.value }))} aria-required="true" />
            </div>
            <div className="form-group">
              <label htmlFor="register-data-subjects">{t('admin_register_tab.label_data_subjects')}</label>
              <input id="register-data-subjects" type="text" value={form.data_subjects} onChange={e => setForm(p => ({ ...p, data_subjects: e.target.value }))} aria-required="true" />
            </div>
            <div className="form-group">
              <label htmlFor="register-recipients">{t('admin_register_tab.label_recipients')}</label>
              <input id="register-recipients" type="text" value={form.recipients} onChange={e => setForm(p => ({ ...p, recipients: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="register-retention">{t('admin_register_tab.label_retention_period')}</label>
              <input id="register-retention" type="text" value={form.retention_period} onChange={e => setForm(p => ({ ...p, retention_period: e.target.value }))} aria-required="true" />
            </div>
            <div className="form-group">
              <label htmlFor="register-security">{t('admin_register_tab.label_security_measures')}</label>
              <textarea id="register-security" value={form.security_measures} onChange={e => setForm(p => ({ ...p, security_measures: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetForm}>{t('admin_register_tab.btn_cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.name} aria-busy={saving}>
              {saving ? t('admin_register_tab.btn_saving') : t('admin_register_tab.btn_save')}
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="unified-card"><p className="text-center text-secondary">{t('admin_register_tab.no_entries')}</p></div>
      ) : (
        <div className="rgpd-register-list">
          {entries.map(entry => (
            <article key={entry.id} className="unified-card rgpd-register-item">
              <div className="rgpd-register-item-header">
                <h3>{entry.name}</h3>
                {(can('rgpd.registre.update') || can('rgpd.registre.delete')) && (
                  <div className="rgpd-register-actions">
                    {can('rgpd.registre.update') && (
                      <button className="btn-icon btn-icon-secondary" onClick={() => handleEdit(entry)} aria-label={t('admin_register_tab.btn_edit_title')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                    {can('rgpd.registre.delete') && (
                      <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(entry.id)} aria-label={t('admin_register_tab.btn_delete_title')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <dl className="rgpd-register-item-details">
                <div><dt>{t('admin_register_tab.detail_purpose')}</dt><dd>{entry.purpose}</dd></div>
                <div><dt>{t('admin_register_tab.detail_legal_basis')}</dt><dd>{entry.legal_basis}</dd></div>
                <div><dt>{t('admin_register_tab.detail_data')}</dt><dd>{entry.data_categories}</dd></div>
                <div><dt>{t('admin_register_tab.detail_subjects')}</dt><dd>{entry.data_subjects}</dd></div>
                <div><dt>{t('admin_register_tab.detail_retention')}</dt><dd>{entry.retention_period}</dd></div>
                {entry.recipients && <div><dt>{t('admin_register_tab.detail_recipients')}</dt><dd>{entry.recipients}</dd></div>}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Rights Tab ---- */

function RightsTab() {
  const { t } = useTranslation('rgpd')
  const { can } = usePermission()
  const [requests, setRequests] = useState<RightsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [responseText, setResponseText] = useState('')
  const [responseStatus, setResponseStatus] = useState('completed')

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/rights/admin', { params: { page, per_page: 25 } })
      setRequests(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch { /* */ } finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleProcess = async (id: number, e?: React.FormEvent) => {
    if (e) e.preventDefault()
    try {
      await api.put(`/rgpd/rights/admin/${id}`, {
        status: responseStatus,
        admin_response: responseText || null,
      })
      setProcessingId(null)
      setResponseText('')
      load()
    } catch { /* */ }
  }

  const totalPages = Math.ceil(total / 25)

  if (loading) return <div className="text-center loading-pad-lg" aria-busy="true"><div className="spinner" role="status"><span className="sr-only">{t('admin_rights_tab.aria_loading')}</span></div></div>

  return (
    <div>
      <h2>{t('admin_rights_tab.heading')}</h2>
      {requests.length === 0 ? (
        <div className="unified-card"><p className="text-center text-secondary">{t('admin_rights_tab.no_requests')}</p></div>
      ) : (
        <div className="rgpd-requests-admin-list">
          {requests.map(req => {
            const statusClassName = STATUS_CLASSNAMES[req.status] || STATUS_CLASSNAMES.pending
            const statusLabelKey = STATUS_LABEL_KEYS[req.status] || STATUS_LABEL_KEYS.pending
            const typeLabelKey = TYPE_LABEL_KEYS[req.request_type]
            return (
              <article key={req.id} className="unified-card rgpd-request-admin-item">
                <div className="rgpd-request-header">
                  <div>
                    <h3>{typeLabelKey ? t(typeLabelKey) : req.request_type}</h3>
                    <span className="text-secondary">
                      {req.user_email || t('admin_rights_tab.unknown_user')} — {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <span className={`rgpd-status ${statusClassName}`}>{t(statusLabelKey)}</span>
                </div>
                {req.description && <p className="rgpd-request-description">{req.description}</p>}
                {req.admin_response && (
                  <div className="rgpd-request-response"><strong>{t('admin_rights_tab.response_label')}</strong> {req.admin_response}</div>
                )}
                {can('rgpd.droits.process') && (req.status === 'pending' || req.status === 'processing') ? (
                  processingId === req.id ? (
                    <form
                      className="rgpd-process-form"
                      onSubmit={(e) => handleProcess(req.id, e)}
                      aria-label={t('admin_rights_tab.aria_process_form')}
                    >
                      <div className="form-group">
                        <label htmlFor={`process-status-${req.id}`}>{t('admin_rights_tab.form_status_label')}</label>
                        <select id={`process-status-${req.id}`} value={responseStatus} onChange={e => setResponseStatus(e.target.value)}>
                          <option value="processing">{t('admin_rights_tab.option_processing')}</option>
                          <option value="completed">{t('admin_rights_tab.option_completed')}</option>
                          <option value="rejected">{t('admin_rights_tab.option_rejected')}</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`process-response-${req.id}`}>{t('admin_rights_tab.form_response_label')}</label>
                        <textarea id={`process-response-${req.id}`} value={responseText} onChange={e => setResponseText(e.target.value)} rows={2} placeholder={t('admin_rights_tab.form_response_placeholder')} />
                      </div>
                      <div className="form-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setProcessingId(null)}>{t('admin_rights_tab.btn_cancel')}</button>
                        <button type="submit" className="btn btn-primary btn-sm">{t('admin_rights_tab.btn_validate')}</button>
                      </div>
                    </form>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => { setProcessingId(req.id); setResponseStatus(req.status === 'pending' ? 'processing' : 'completed') }}>
                      {t('admin_rights_tab.btn_process')}
                    </button>
                  )
                ) : null}
              </article>
            )
          })}
        </div>
      )}
      {total > 25 && (
        <nav className="rgpd-pagination" aria-label={t('admin_rights_tab.aria_pagination')}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label={t('admin_rights_tab.btn_previous')}>{t('admin_rights_tab.btn_previous')}</button>
          <span aria-current="page">{t('admin_rights_tab.page_label')} {page} / {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={requests.length < 25} onClick={() => setPage(p => p + 1)} aria-label={t('admin_rights_tab.btn_next')}>{t('admin_rights_tab.btn_next')}</button>
        </nav>
      )}
    </div>
  )
}

/* ---- Audit Tab ---- */

function AuditTab() {
  const { t, i18n } = useTranslation('rgpd')
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/audit/', { params: { page, per_page: 25 } })
      setLogs(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch {
      setError(t('admin_audit_tab.error_load'))
      setTimeout(() => setError(''), 5000)
    } finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 25)

  if (loading) return <div className="text-center loading-pad-lg" aria-busy="true"><div className="spinner" role="status"><span className="sr-only">{t('admin_audit_tab.aria_loading')}</span></div></div>

  return (
    <div>
      <h2>{t('admin_audit_tab.heading')}</h2>
      {error && <div className="alert alert-danger mb-16" role="alert">{error}</div>}
      {logs.length === 0 && !error ? (
        <div className="unified-card"><p className="text-center text-secondary">{t('admin_audit_tab.no_logs')}</p></div>
      ) : logs.length > 0 && (
        <div className="table-container">
          <table className="rgpd-audit-table">
            <caption className="sr-only">{t('admin_audit_tab.aria_table_caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('admin_audit_tab.col_date')}</th>
                <th scope="col">{t('admin_audit_tab.col_user')}</th>
                <th scope="col">{t('admin_audit_tab.col_target')}</th>
                <th scope="col">{t('admin_audit_tab.col_action')}</th>
                <th scope="col">{t('admin_audit_tab.col_resource')}</th>
                <th scope="col">{t('admin_audit_tab.col_details')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString(i18n.language || 'fr')}</td>
                  <td>{log.accessor_email || '—'}</td>
                  <td>{log.target_user_email || '—'}</td>
                  <td>{log.action}</td>
                  <td>{log.resource_type}</td>
                  <td>{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > 25 && (
        <nav className="rgpd-pagination" aria-label={t('admin_audit_tab.aria_pagination')}>
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label={t('admin_audit_tab.btn_previous')}>{t('admin_audit_tab.btn_previous')}</button>
          <span aria-current="page">{t('admin_audit_tab.page_label')} {page} / {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={logs.length < 25} onClick={() => setPage(p => p + 1)} aria-label={t('admin_audit_tab.btn_next')}>{t('admin_audit_tab.btn_next')}</button>
        </nav>
      )}
    </div>
  )
}

/* ---- Legal Pages Tab ---- */

function LegalPagesTab() {
  const { t } = useTranslation('rgpd')
  const { can } = usePermission()
  const [pages, setPages] = useState<LegalPageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content_html: '', is_published: false, requires_acceptance: false })
  const [saving, setSaving] = useState(false)
  const [versionsSlug, setVersionsSlug] = useState<string | null>(null)
  const [versions, setVersions] = useState<LegalPageVersionItem[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/legal/')
      setPages(res.data.items || [])
    } catch {
      setError(t('admin_legal_pages_tab.error_load'))
      setTimeout(() => setError(''), 5000)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleEdit = (page: LegalPageItem) => {
    setForm({ title: page.title, content_html: page.content_html, is_published: page.is_published, requires_acceptance: page.requires_acceptance })
    setEditingSlug(page.slug)
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!editingSlug) return
    setSaving(true)
    try {
      await api.put(`/rgpd/legal/${editingSlug}`, form)
      setEditingSlug(null)
      load()
    } catch {
      setError(t('admin_legal_pages_tab.error_save'))
      setTimeout(() => setError(''), 5000)
    } finally { setSaving(false) }
  }

  const handleShowVersions = async (slug: string) => {
    if (versionsSlug === slug) {
      setVersionsSlug(null)
      return
    }
    setVersionsSlug(slug)
    setLoadingVersions(true)
    try {
      const res = await api.get(`/rgpd/legal/${slug}/versions`)
      setVersions(res.data || [])
    } catch {
      setVersions([])
      setError(t('admin_legal_pages_tab.error_versions'))
      setTimeout(() => setError(''), 5000)
    } finally { setLoadingVersions(false) }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return dateStr }
  }

  // Check if current edit is modifying a requires_acceptance document
  const editingPage = editingSlug ? pages.find(p => p.slug === editingSlug) : null
  const showUpdateWarning = editingPage && editingPage.requires_acceptance && editingPage.version > 0

  if (loading) return <div className="text-center loading-pad-lg" aria-busy="true"><div className="spinner" role="status"><span className="sr-only">{t('admin_legal_pages_tab.aria_loading')}</span></div></div>

  return (
    <div>
      {error && <div className="alert alert-danger mb-16" role="alert">{error}</div>}

      <h2>{t('admin_legal_pages_tab.heading')}</h2>

      {editingSlug && (
        <form
          className="unified-card rgpd-legal-form"
          onSubmit={handleSave}
          aria-label={t('admin_legal_pages_tab.form_title_prefix') + ' ' + editingSlug}
        >
          <h3>{t('admin_legal_pages_tab.form_title_prefix')} {editingSlug}</h3>
          {showUpdateWarning && (
            <div className="alert alert-warning mb-16" role="alert">
              {t('admin_legal_pages_tab.warning_acceptance_invalidation')}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="legal-edit-title">{t('admin_legal_pages_tab.label_title')}</label>
            <input id="legal-edit-title" type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} aria-required="true" />
          </div>
          <div className="form-group">
            <label htmlFor="legal-edit-content">{t('admin_legal_pages_tab.label_content_html')}</label>
            <textarea id="legal-edit-content" value={form.content_html} onChange={e => setForm(p => ({ ...p, content_html: e.target.value }))} rows={12} className="rgpd-html-editor" aria-required="true" />
          </div>
          <div className="form-group">
            <label className="rgpd-checkbox-label">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} />
              {t('admin_legal_pages_tab.label_published')}
            </label>
          </div>
          <div className="form-group">
            <label className="rgpd-checkbox-label">
              <input type="checkbox" checked={form.requires_acceptance} onChange={e => setForm(p => ({ ...p, requires_acceptance: e.target.checked }))} aria-describedby="acceptance-hint" />
              {t('admin_legal_pages_tab.label_requires_acceptance')}
            </label>
            <p id="acceptance-hint" className="text-secondary text-sm">{t('admin_legal_pages_tab.acceptance_hint')}</p>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setEditingSlug(null)}>{t('admin_legal_pages_tab.btn_cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.title} aria-busy={saving}>
              {saving ? t('admin_legal_pages_tab.btn_saving') : t('admin_legal_pages_tab.btn_save')}
            </button>
          </div>
        </form>
      )}

      <div className="rgpd-legal-list">
        {pages.map(page => (
          <article key={page.slug} className="unified-card rgpd-legal-item">
            <div className="rgpd-legal-item-header">
              <div>
                <h3>{page.title}</h3>
                <span className="text-secondary">{page.slug} — v{page.version}</span>
              </div>
              <div className="rgpd-legal-item-actions">
                {page.requires_acceptance && (
                  <span className="rgpd-badge rgpd-badge-warning">{t('admin_legal_pages_tab.badge_required')}</span>
                )}
                <span className={`rgpd-badge ${page.is_published ? 'rgpd-badge-success' : 'rgpd-badge-draft'}`}>
                  {page.is_published ? t('admin_legal_pages_tab.badge_published') : t('admin_legal_pages_tab.badge_draft')}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleShowVersions(page.slug)}
                  aria-expanded={versionsSlug === page.slug}
                  aria-controls={`version-history-${page.slug}`}
                >
                  {t('admin_legal_pages_tab.btn_history')}
                </button>
                {can('rgpd.politique.update') && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(page)}>
                    {t('admin_legal_pages_tab.btn_edit')}
                  </button>
                )}
              </div>
            </div>

            {versionsSlug === page.slug && (
              <div id={`version-history-${page.slug}`} className="legal-version-history">
                {loadingVersions ? (
                  <div className="text-center" aria-busy="true"><div className="spinner spinner-sm" role="status"><span className="sr-only">{t('admin_legal_pages_tab.aria_loading')}</span></div></div>
                ) : versions.length === 0 ? (
                  <p className="text-secondary">{t('admin_legal_pages_tab.no_previous_versions')}</p>
                ) : (
                  <div className="legal-version-list">
                    {versions.map(v => (
                      <div key={v.version} className="legal-version-item">
                        <div className="legal-version-item-header">
                          <strong>{t('admin_legal_pages_tab.version_label')} {v.version}</strong>
                          <span className="text-secondary"><time dateTime={v.created_at}>{formatDate(v.created_at)}</time></span>
                        </div>
                        <p className="text-secondary text-sm">{v.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
