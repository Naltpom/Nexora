import { useState, useEffect, useCallback } from 'react'
import Layout from '../Layout'
import api from '../../api'
import './rgpd.scss'

interface RightsRequest {
  id: number
  request_type: string
  status: string
  description: string | null
  admin_response: string | null
  created_at: string
  completed_at: string | null
}

const REQUEST_TYPES: Record<string, { label: string; description: string }> = {
  access: { label: 'Droit d\'acces', description: 'Obtenir une copie de toutes les donnees personnelles vous concernant.' },
  rectification: { label: 'Droit de rectification', description: 'Corriger des donnees inexactes ou incompletes.' },
  erasure: { label: 'Droit a l\'effacement', description: 'Demander la suppression de vos donnees personnelles.' },
  portability: { label: 'Droit a la portabilite', description: 'Recevoir vos donnees dans un format structure et lisible.' },
  opposition: { label: 'Droit d\'opposition', description: 'Vous opposer au traitement de vos donnees personnelles.' },
  limitation: { label: 'Droit a la limitation', description: 'Demander la limitation du traitement de vos donnees.' },
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'rgpd-status-pending' },
  processing: { label: 'En cours', className: 'rgpd-status-processing' },
  completed: { label: 'Traitee', className: 'rgpd-status-completed' },
  rejected: { label: 'Refusee', className: 'rgpd-status-rejected' },
}

export default function RightsRequestPage() {
  const [requests, setRequests] = useState<RightsRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('access')
  const [formDescription, setFormDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/rights/my')
      setRequests(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.post('/rgpd/rights/', {
        request_type: formType,
        description: formDescription || null,
      })
      setSuccess('Votre demande a ete soumise. Nous la traiterons dans les meilleurs delais.')
      setShowForm(false)
      setFormDescription('')
      setTimeout(() => setSuccess(''), 5000)
      loadRequests()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la soumission.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Exercice des droits" breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Mes droits' }]}>
        <div className="text-center loading-pad-lg"><div className="spinner" /></div>
      </Layout>
    )
  }

  return (
    <Layout title="Exercice des droits" breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Mes droits' }]}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Exercice des droits RGPD</h1>
            <p>Conformement au RGPD, vous pouvez exercer vos droits sur vos donnees personnelles.</p>
          </div>
          <div className="unified-page-header-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Annuler' : 'Nouvelle demande'}
            </button>
          </div>
        </div>
      </div>

      {success && <div className="alert alert-success mb-16">{success}</div>}
      {error && <div className="alert alert-error mb-16">{error}</div>}

      {showForm && (
        <div className="unified-card rgpd-rights-form">
          <h3>Nouvelle demande</h3>
          <div className="form-group">
            <label>Type de demande</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)}>
              {Object.entries(REQUEST_TYPES).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
            <small>{REQUEST_TYPES[formType]?.description}</small>
          </div>
          <div className="form-group">
            <label>Description (optionnel)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Precisions sur votre demande..."
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Envoi...' : 'Soumettre la demande'}
            </button>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="unified-card">
          <p className="text-center text-secondary">Aucune demande pour le moment.</p>
        </div>
      ) : (
        <div className="rgpd-requests-list">
          {requests.map((req) => {
            const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.pending
            const typeInfo = REQUEST_TYPES[req.request_type]
            return (
              <div key={req.id} className="unified-card rgpd-request-item">
                <div className="rgpd-request-header">
                  <div>
                    <h3>{typeInfo?.label || req.request_type}</h3>
                    <span className="rgpd-request-date">
                      {new Date(req.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <span className={`rgpd-status ${statusInfo.className}`}>
                    {statusInfo.label}
                  </span>
                </div>
                {req.description && (
                  <p className="rgpd-request-description">{req.description}</p>
                )}
                {req.admin_response && (
                  <div className="rgpd-request-response">
                    <strong>Reponse :</strong>
                    <p>{req.admin_response}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
