import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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

const REQUEST_TYPE_KEYS: Record<string, { labelKey: string; descriptionKey: string }> = {
  access: { labelKey: 'rights_request_page.type_access_label', descriptionKey: 'rights_request_page.type_access_description' },
  rectification: { labelKey: 'rights_request_page.type_rectification_label', descriptionKey: 'rights_request_page.type_rectification_description' },
  erasure: { labelKey: 'rights_request_page.type_erasure_label', descriptionKey: 'rights_request_page.type_erasure_description' },
  portability: { labelKey: 'rights_request_page.type_portability_label', descriptionKey: 'rights_request_page.type_portability_description' },
  opposition: { labelKey: 'rights_request_page.type_opposition_label', descriptionKey: 'rights_request_page.type_opposition_description' },
  limitation: { labelKey: 'rights_request_page.type_limitation_label', descriptionKey: 'rights_request_page.type_limitation_description' },
}

const STATUS_CLASSNAMES: Record<string, string> = {
  pending: 'rgpd-status-pending',
  processing: 'rgpd-status-processing',
  completed: 'rgpd-status-completed',
  rejected: 'rgpd-status-rejected',
}

export default function RightsRequestPage() {
  const { t } = useTranslation('rgpd')
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.post('/rgpd/rights/', {
        request_type: formType,
        description: formDescription || null,
      })
      setSuccess(t('rights_request_page.success_message'))
      setShowForm(false)
      setFormDescription('')
      setTimeout(() => setSuccess(''), 5000)
      loadRequests()
    } catch (err: any) {
      setError(err.response?.data?.detail || t('rights_request_page.error_default'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Layout title={t('rights_request_page.page_title')} breadcrumb={[{ label: t('rights_request_page.breadcrumb_home'), path: '/' }, { label: t('rights_request_page.breadcrumb_label') }]}>
        <div className="text-center loading-pad-lg" aria-busy="true"><div className="spinner" role="status"><span className="sr-only">{t('rights_request_page.aria_loading')}</span></div></div>
      </Layout>
    )
  }

  return (
    <Layout title={t('rights_request_page.page_title')} breadcrumb={[{ label: t('rights_request_page.breadcrumb_home'), path: '/' }, { label: t('rights_request_page.breadcrumb_label') }]}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('rights_request_page.heading')}</h1>
            <p>{t('rights_request_page.description')}</p>
          </div>
          <div className="unified-page-header-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowForm(!showForm)}
              aria-expanded={showForm}
              aria-controls="rights-request-form"
            >
              {showForm ? t('rights_request_page.btn_cancel') : t('rights_request_page.btn_new_request')}
            </button>
          </div>
        </div>
      </div>

      {success && <div className="alert alert-success mb-16" role="status">{success}</div>}
      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {showForm && (
        <form
          id="rights-request-form"
          className="unified-card rgpd-rights-form"
          onSubmit={handleSubmit}
          aria-label={t('rights_request_page.form_title')}
        >
          <h2>{t('rights_request_page.form_title')}</h2>
          <div className="form-group">
            <label htmlFor="rights-type">{t('rights_request_page.form_type_label')}</label>
            <select id="rights-type" value={formType} onChange={(e) => setFormType(e.target.value)} aria-required="true" aria-describedby="rights-type-desc">
              {Object.entries(REQUEST_TYPE_KEYS).map(([key, info]) => (
                <option key={key} value={key}>{t(info.labelKey)}</option>
              ))}
            </select>
            <small id="rights-type-desc">{t(REQUEST_TYPE_KEYS[formType]?.descriptionKey)}</small>
          </div>
          <div className="form-group">
            <label htmlFor="rights-description">{t('rights_request_page.form_description_label')}</label>
            <textarea
              id="rights-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={t('rights_request_page.form_description_placeholder')}
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting} aria-busy={submitting}>
              {submitting ? t('rights_request_page.btn_submitting') : t('rights_request_page.btn_submit')}
            </button>
          </div>
        </form>
      )}

      {requests.length === 0 ? (
        <div className="unified-card">
          <p className="text-center text-secondary">{t('rights_request_page.no_requests')}</p>
        </div>
      ) : (
        <section aria-label={t('rights_request_page.aria_requests_list')}>
          <div className="rgpd-requests-list">
            {requests.map((req) => {
              const statusClassName = STATUS_CLASSNAMES[req.status] || STATUS_CLASSNAMES.pending
              const statusLabelKey = `rights_request_page.status_${req.status}` as const
              const typeKeys = REQUEST_TYPE_KEYS[req.request_type]
              return (
                <article key={req.id} className="unified-card rgpd-request-item">
                  <div className="rgpd-request-header">
                    <div>
                      <h2>{typeKeys ? t(typeKeys.labelKey) : req.request_type}</h2>
                      <span className="rgpd-request-date">
                        {new Date(req.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <span className={`rgpd-status ${statusClassName}`}>
                      {t(statusLabelKey)}
                    </span>
                  </div>
                  {req.description && (
                    <p className="rgpd-request-description">{req.description}</p>
                  )}
                  {req.admin_response && (
                    <div className="rgpd-request-response">
                      <strong>{t('rights_request_page.response_label')}</strong>
                      <p>{req.admin_response}</p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
    </Layout>
  )
}
