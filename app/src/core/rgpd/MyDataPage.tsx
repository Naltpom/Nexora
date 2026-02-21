import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../Layout'
import api from '../../api'
import './rgpd.scss'

interface DataSection {
  section: string
  count: number
  fields: string[]
}

export default function MyDataPage() {
  const [sections, setSections] = useState<DataSection[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  const loadPreview = useCallback(async () => {
    try {
      const res = await api.get('/rgpd/export/preview')
      setSections(res.data.sections || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPreview() }, [loadPreview])

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(format)
    try {
      const res = await api.post(`/rgpd/export/${format}`, {}, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `mes-donnees.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // silently fail
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <Layout title="Mes donnees" breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Mes donnees' }]}>
        <div className="text-center loading-pad-lg"><div className="spinner" /></div>
      </Layout>
    )
  }

  return (
    <Layout title="Mes donnees" breadcrumb={[{ label: 'Accueil', path: '/' }, { label: 'Mes donnees' }]}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>Mes donnees personnelles</h1>
            <p>
              Consultez les donnees que nous stockons a votre sujet.
              Vous pouvez les exporter ou exercer vos droits RGPD.
            </p>
          </div>
          <div className="unified-page-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'csv' ? 'Export...' : 'Exporter CSV'}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleExport('json')}
              disabled={exporting !== null}
            >
              {exporting === 'json' ? 'Export...' : 'Exporter JSON'}
            </button>
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="unified-card">
          <p className="text-center text-secondary">Aucune donnee trouvee.</p>
        </div>
      ) : (
        <div className="rgpd-data-sections">
          {sections.map((s) => (
            <div key={s.section} className="unified-card rgpd-data-section">
              <div className="rgpd-data-section-header">
                <h3>{s.section}</h3>
                <span className="rgpd-badge">{s.count} enregistrement{s.count > 1 ? 's' : ''}</span>
              </div>
              <div className="rgpd-data-fields">
                {s.fields.map((f) => (
                  <span key={f} className="rgpd-field-tag">{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="unified-card rgpd-rights-cta">
        <h3>Gerer mes preferences</h3>
        <p>
          Configurez vos preferences de cookies et traceurs et de consentement.
          Vous pouvez activer ou desactiver chaque categorie de cookies et traceurs a tout moment.
        </p>
        <Link to="/rgpd/consent" className="btn btn-secondary btn-sm">
          Preferences de consentement
        </Link>
      </div>

      <div className="unified-card rgpd-rights-cta">
        <h3>Exercer vos droits</h3>
        <p>
          Vous avez le droit d'acceder a vos donnees, de les rectifier, de les supprimer,
          de vous opposer a leur traitement ou de demander leur portabilite.
        </p>
        <Link to="/rgpd/rights" className="btn btn-primary btn-sm">
          Faire une demande
        </Link>
      </div>
    </Layout>
  )
}
