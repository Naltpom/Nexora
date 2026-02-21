import { useState, useEffect, useCallback } from 'react'
import Layout from '../Layout'
import { usePermission } from '../PermissionContext'
import api from '../../api'
import './rgpd.scss'

type Tab = 'registre' | 'droits' | 'audit' | 'pages'

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

const TYPE_LABELS: Record<string, string> = {
  access: 'Acces', rectification: 'Rectification', erasure: 'Effacement',
  portability: 'Portabilite', opposition: 'Opposition', limitation: 'Limitation',
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'rgpd-status-pending' },
  processing: { label: 'En cours', className: 'rgpd-status-processing' },
  completed: { label: 'Traitee', className: 'rgpd-status-completed' },
  rejected: { label: 'Refusee', className: 'rgpd-status-rejected' },
}

export default function AdminRGPDPage() {
  const { can } = usePermission()
  const [activeTab, setActiveTab] = useState<Tab>('registre')

  const tabs: { key: Tab; label: string; permission?: string }[] = [
    { key: 'registre', label: 'Registre', permission: 'rgpd.registre.read' },
    { key: 'droits', label: 'Demandes de droits', permission: 'rgpd.droits.manage' },
    { key: 'audit', label: 'Audit', permission: 'rgpd.audit.read' },
    { key: 'pages', label: 'Pages legales', permission: 'rgpd.politique.manage' },
  ]

  const visibleTabs = tabs.filter(t => !t.permission || can(t.permission))

  return (
    <Layout
      title="Administration RGPD"
      breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Admin RGPD' }]}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>RGPD & Conformite</h1>
            <p>Gestion de la conformite RGPD : registre des traitements, demandes de droits, audit, pages legales.</p>
          </div>
        </div>
      </div>

      <div className="rgpd-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`rgpd-tab${activeTab === tab.key ? ' rgpd-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'registre' && <RegisterTab />}
      {activeTab === 'droits' && <RightsTab />}
      {activeTab === 'audit' && <AuditTab />}
      {activeTab === 'pages' && <LegalPagesTab />}
    </Layout>
  )
}

/* ---- Register Tab ---- */

function RegisterTab() {
  const [entries, setEntries] = useState<RegisterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '', purpose: '', legal_basis: 'consentement', data_categories: '',
    data_subjects: '', recipients: '', retention_period: '', security_measures: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/register/')
      setEntries(res.data.items || [])
    } catch { /* */ } finally { setLoading(false) }
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

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editId) {
        await api.put(`/rgpd/register/${editId}`, form)
      } else {
        await api.post('/rgpd/register/', form)
      }
      resetForm()
      load()
    } catch { /* */ } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette entree du registre ?')) return
    await api.delete(`/rgpd/register/${id}`)
    load()
  }

  if (loading) return <div className="text-center loading-pad-lg"><div className="spinner" /></div>

  return (
    <div>
      <div className="rgpd-section-header">
        <h2>Registre des traitements (Article 30)</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>
          Ajouter un traitement
        </button>
      </div>

      {showForm && (
        <div className="unified-card rgpd-register-form">
          <h3>{editId ? 'Modifier' : 'Nouveau'} traitement</h3>
          <div className="settings-grid">
            <div className="form-group">
              <label>Nom du traitement</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Base legale</label>
              <select value={form.legal_basis} onChange={e => setForm(p => ({ ...p, legal_basis: e.target.value }))}>
                <option value="consentement">Consentement</option>
                <option value="contrat">Execution d'un contrat</option>
                <option value="obligation_legale">Obligation legale</option>
                <option value="interet_vital">Interet vital</option>
                <option value="interet_public">Mission d'interet public</option>
                <option value="interet_legitime">Interet legitime</option>
              </select>
            </div>
            <div className="form-group">
              <label>Finalite</label>
              <textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} rows={2} />
            </div>
            <div className="form-group">
              <label>Categories de donnees</label>
              <input type="text" value={form.data_categories} onChange={e => setForm(p => ({ ...p, data_categories: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Personnes concernees</label>
              <input type="text" value={form.data_subjects} onChange={e => setForm(p => ({ ...p, data_subjects: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Destinataires</label>
              <input type="text" value={form.recipients} onChange={e => setForm(p => ({ ...p, recipients: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Duree de conservation</label>
              <input type="text" value={form.retention_period} onChange={e => setForm(p => ({ ...p, retention_period: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Mesures de securite</label>
              <textarea value={form.security_measures} onChange={e => setForm(p => ({ ...p, security_measures: e.target.value }))} rows={2} />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={resetForm}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="unified-card"><p className="text-center text-secondary">Aucun traitement enregistre.</p></div>
      ) : (
        <div className="rgpd-register-list">
          {entries.map(entry => (
            <div key={entry.id} className="unified-card rgpd-register-item">
              <div className="rgpd-register-item-header">
                <h3>{entry.name}</h3>
                <div className="rgpd-register-actions">
                  <button className="btn-icon btn-icon-secondary" onClick={() => handleEdit(entry)} title="Modifier">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(entry.id)} title="Supprimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              <div className="rgpd-register-item-details">
                <div><strong>Finalite :</strong> {entry.purpose}</div>
                <div><strong>Base legale :</strong> {entry.legal_basis}</div>
                <div><strong>Donnees :</strong> {entry.data_categories}</div>
                <div><strong>Personnes :</strong> {entry.data_subjects}</div>
                <div><strong>Conservation :</strong> {entry.retention_period}</div>
                {entry.recipients && <div><strong>Destinataires :</strong> {entry.recipients}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Rights Tab ---- */

function RightsTab() {
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

  const handleProcess = async (id: number) => {
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

  if (loading) return <div className="text-center loading-pad-lg"><div className="spinner" /></div>

  return (
    <div>
      <h2>Demandes d'exercice de droits</h2>
      {requests.length === 0 ? (
        <div className="unified-card"><p className="text-center text-secondary">Aucune demande.</p></div>
      ) : (
        <div className="rgpd-requests-admin-list">
          {requests.map(req => {
            const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.pending
            return (
              <div key={req.id} className="unified-card rgpd-request-admin-item">
                <div className="rgpd-request-header">
                  <div>
                    <h3>{TYPE_LABELS[req.request_type] || req.request_type}</h3>
                    <span className="text-secondary">
                      {req.user_email || 'Utilisateur inconnu'} — {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <span className={`rgpd-status ${statusInfo.className}`}>{statusInfo.label}</span>
                </div>
                {req.description && <p className="rgpd-request-description">{req.description}</p>}
                {req.admin_response && (
                  <div className="rgpd-request-response"><strong>Reponse :</strong> {req.admin_response}</div>
                )}
                {req.status === 'pending' || req.status === 'processing' ? (
                  processingId === req.id ? (
                    <div className="rgpd-process-form">
                      <div className="form-group">
                        <label>Statut</label>
                        <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}>
                          <option value="processing">En cours de traitement</option>
                          <option value="completed">Traitee</option>
                          <option value="rejected">Refusee</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Reponse</label>
                        <textarea value={responseText} onChange={e => setResponseText(e.target.value)} rows={2} placeholder="Reponse au demandeur..." />
                      </div>
                      <div className="form-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setProcessingId(null)}>Annuler</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleProcess(req.id)}>Valider</button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => { setProcessingId(req.id); setResponseStatus(req.status === 'pending' ? 'processing' : 'completed') }}>
                      Traiter
                    </button>
                  )
                ) : null}
              </div>
            )
          })}
        </div>
      )}
      {total > 25 && (
        <div className="rgpd-pagination">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Precedent</button>
          <span>Page {page}</span>
          <button className="btn btn-secondary btn-sm" disabled={requests.length < 25} onClick={() => setPage(p => p + 1)}>Suivant</button>
        </div>
      )}
    </div>
  )
}

/* ---- Audit Tab ---- */

function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/audit/', { params: { page, per_page: 25 } })
      setLogs(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch { /* */ } finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="text-center loading-pad-lg"><div className="spinner" /></div>

  return (
    <div>
      <h2>Journal d'audit des acces</h2>
      {logs.length === 0 ? (
        <div className="unified-card"><p className="text-center text-secondary">Aucun log d'acces.</p></div>
      ) : (
        <div className="table-container">
          <table className="rgpd-audit-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Ressource</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                  <td>{log.accessor_email || '—'}</td>
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
        <div className="rgpd-pagination">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Precedent</button>
          <span>Page {page}</span>
          <button className="btn btn-secondary btn-sm" disabled={logs.length < 25} onClick={() => setPage(p => p + 1)}>Suivant</button>
        </div>
      )}
    </div>
  )
}

/* ---- Legal Pages Tab ---- */

function LegalPagesTab() {
  const [pages, setPages] = useState<LegalPageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', content_html: '', is_published: false, requires_acceptance: false })
  const [saving, setSaving] = useState(false)
  const [versionsSlug, setVersionsSlug] = useState<string | null>(null)
  const [versions, setVersions] = useState<LegalPageVersionItem[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/legal/')
      setPages(res.data.items || [])
    } catch { /* */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleEdit = (page: LegalPageItem) => {
    setForm({ title: page.title, content_html: page.content_html, is_published: page.is_published, requires_acceptance: page.requires_acceptance })
    setEditingSlug(page.slug)
  }

  const handleSave = async () => {
    if (!editingSlug) return
    setSaving(true)
    try {
      await api.put(`/rgpd/legal/${editingSlug}`, form)
      setEditingSlug(null)
      load()
    } catch { /* */ } finally { setSaving(false) }
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
    } catch { setVersions([]) } finally { setLoadingVersions(false) }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return dateStr }
  }

  // Check if current edit is modifying a requires_acceptance document
  const editingPage = editingSlug ? pages.find(p => p.slug === editingSlug) : null
  const showUpdateWarning = editingPage && editingPage.requires_acceptance && editingPage.version > 0

  if (loading) return <div className="text-center loading-pad-lg"><div className="spinner" /></div>

  return (
    <div>
      <h2>Pages legales</h2>

      {editingSlug && (
        <div className="unified-card rgpd-legal-form">
          <h3>Editer : {editingSlug}</h3>
          {showUpdateWarning && (
            <div className="alert alert-warning mb-16">
              Attention : la modification de ce document invalidera toutes les acceptations existantes. Tous les utilisateurs devront re-accepter.
            </div>
          )}
          <div className="form-group">
            <label>Titre</label>
            <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contenu (HTML)</label>
            <textarea value={form.content_html} onChange={e => setForm(p => ({ ...p, content_html: e.target.value }))} rows={12} className="rgpd-html-editor" />
          </div>
          <div className="form-group">
            <label className="rgpd-checkbox-label">
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} />
              Publiee
            </label>
          </div>
          <div className="form-group">
            <label className="rgpd-checkbox-label">
              <input type="checkbox" checked={form.requires_acceptance} onChange={e => setForm(p => ({ ...p, requires_acceptance: e.target.checked }))} />
              Acceptation obligatoire
            </label>
            <p className="text-secondary text-sm">Si active, les utilisateurs devront accepter ce document pour acceder au site.</p>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setEditingSlug(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      <div className="rgpd-legal-list">
        {pages.map(page => (
          <div key={page.slug} className="unified-card rgpd-legal-item">
            <div className="rgpd-legal-item-header">
              <div>
                <h3>{page.title}</h3>
                <span className="text-secondary">{page.slug} — v{page.version}</span>
              </div>
              <div className="rgpd-legal-item-actions">
                {page.requires_acceptance && (
                  <span className="rgpd-badge rgpd-badge-warning">Obligatoire</span>
                )}
                <span className={`rgpd-badge ${page.is_published ? 'rgpd-badge-success' : 'rgpd-badge-draft'}`}>
                  {page.is_published ? 'Publiee' : 'Brouillon'}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => handleShowVersions(page.slug)}>
                  Historique
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(page)}>
                  Editer
                </button>
              </div>
            </div>

            {versionsSlug === page.slug && (
              <div className="legal-version-history">
                {loadingVersions ? (
                  <div className="text-center"><div className="spinner spinner-sm" /></div>
                ) : versions.length === 0 ? (
                  <p className="text-secondary">Aucune version precedente.</p>
                ) : (
                  <div className="legal-version-list">
                    {versions.map(v => (
                      <div key={v.version} className="legal-version-item">
                        <div className="legal-version-item-header">
                          <strong>Version {v.version}</strong>
                          <span className="text-secondary">{formatDate(v.created_at)}</span>
                        </div>
                        <p className="text-secondary text-sm">{v.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
