import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../Layout'
import api from '../../api'
import { cleanupFunctionalStorage } from './consentManager'
import './rgpd.scss'

interface ConsentState {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

const CONSENT_KEY = 'rgpd_consent_given'

const CONSENT_TYPES: { key: string; labelKey: string; descriptionKey: string; required?: boolean }[] = [
  { key: 'necessary', labelKey: 'consent_page.consent_necessary_label', descriptionKey: 'consent_page.consent_necessary_description', required: true },
  { key: 'functional', labelKey: 'consent_page.consent_functional_label', descriptionKey: 'consent_page.consent_functional_description' },
  { key: 'analytics', labelKey: 'consent_page.consent_analytics_label', descriptionKey: 'consent_page.consent_analytics_description' },
  { key: 'marketing', labelKey: 'consent_page.consent_marketing_label', descriptionKey: 'consent_page.consent_marketing_description' },
]

export default function ConsentPage() {
  const { t } = useTranslation('rgpd')
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true, functional: false, analytics: false, marketing: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  const loadConsent = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/consent/my')
      setConsent({
        necessary: true,
        functional: res.data.functional ?? false,
        analytics: res.data.analytics ?? false,
        marketing: res.data.marketing ?? false,
      })
    } catch {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setConsent({
            necessary: true,
            functional: parsed.functional ?? false,
            analytics: parsed.analytics ?? false,
            marketing: parsed.marketing ?? false,
          })
        } catch { /* ignore */ }
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConsent() }, [loadConsent])

  const handleToggle = (type: string) => {
    if (type === 'necessary') return
    setConsent(prev => ({ ...prev, [type]: !prev[type as keyof ConsentState] }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')
    try {
      const consents = Object.entries(consent).map(([type, granted]) => ({
        consent_type: type,
        granted,
      }))
      await api.put('/rgpd/consent/', { consents })
      localStorage.setItem(CONSENT_KEY, JSON.stringify({
        ...consent,
        date: new Date().toISOString(),
      }))
      if (!consent.functional) {
        cleanupFunctionalStorage()
      }
      setSuccess(t('consent_page.success_message'))
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout title={t('consent_page.page_title')} breadcrumb={[{ label: t('consent_page.breadcrumb_home'), path: '/' }, { label: t('consent_page.breadcrumb_label') }]}>
        <div className="text-center loading-pad-lg"><div className="spinner" /></div>
      </Layout>
    )
  }

  return (
    <Layout title={t('consent_page.page_title')} breadcrumb={[{ label: t('consent_page.breadcrumb_home'), path: '/' }, { label: t('consent_page.breadcrumb_label') }]}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('consent_page.heading')}</h1>
            <p>{t('consent_page.description')}</p>
          </div>
        </div>
      </div>

      {success && <div className="alert alert-success mb-16">{success}</div>}

      <div className="rgpd-consent-list">
        {CONSENT_TYPES.map((info) => (
          <div key={info.key} className="unified-card rgpd-consent-item">
            <div className="rgpd-consent-item-info">
              <div className="rgpd-consent-item-header">
                <h3>{t(info.labelKey)}</h3>
                {info.required && <span className="rgpd-badge rgpd-badge-required">{t('consent_page.badge_required')}</span>}
              </div>
              <p>{t(info.descriptionKey)}</p>
            </div>
            <label className="rgpd-toggle">
              <input
                type="checkbox"
                checked={consent[info.key as keyof ConsentState]}
                onChange={() => handleToggle(info.key)}
                disabled={info.required}
              />
              <span className="rgpd-toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t('consent_page.btn_saving') : t('consent_page.btn_save')}
        </button>
      </div>
    </Layout>
  )
}
