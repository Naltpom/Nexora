import { useState, useEffect, useCallback } from 'react'
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

const CONSENT_LABELS: Record<string, { label: string; description: string; required?: boolean }> = {
  necessary: {
    label: 'Strictement necessaires',
    description: 'Cookies et traceurs indispensables au fonctionnement du site (authentification, securite). Ne peuvent pas etre desactives.',
    required: true,
  },
  functional: {
    label: 'Fonctionnels',
    description: 'Cookies et traceurs qui permettent de memoriser vos preferences (theme, langue, affichage).',
  },
  analytics: {
    label: 'Analytiques',
    description: 'Cookies et traceurs qui nous aident a comprendre comment vous utilisez le site pour l\'ameliorer.',
  },
  marketing: {
    label: 'Marketing',
    description: 'Cookies et traceurs utilises pour afficher des publicites pertinentes. Aucun pour le moment.',
  },
}

export default function ConsentPage() {
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
      setSuccess('Preferences de consentement mises a jour.')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Preferences de consentement" breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Consentement' }]}>
        <div className="text-center loading-pad-lg"><div className="spinner" /></div>
      </Layout>
    )
  }

  return (
    <Layout title="Preferences de consentement" breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Consentement' }]}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Preferences de consentement</h1>
            <p>Gerez vos preferences de cookies et traceurs et de traitement de donnees.</p>
          </div>
        </div>
      </div>

      {success && <div className="alert alert-success mb-16">{success}</div>}

      <div className="rgpd-consent-list">
        {Object.entries(CONSENT_LABELS).map(([type, info]) => (
          <div key={type} className="unified-card rgpd-consent-item">
            <div className="rgpd-consent-item-info">
              <div className="rgpd-consent-item-header">
                <h3>{info.label}</h3>
                {info.required && <span className="rgpd-badge rgpd-badge-required">Obligatoire</span>}
              </div>
              <p>{info.description}</p>
            </div>
            <label className="rgpd-toggle">
              <input
                type="checkbox"
                checked={consent[type as keyof ConsentState]}
                onChange={() => handleToggle(type)}
                disabled={info.required}
              />
              <span className="rgpd-toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer mes preferences'}
        </button>
      </div>
    </Layout>
  )
}
