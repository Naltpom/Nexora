import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('rgpd')
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
      <Layout title={t('my_data_page.page_title')} breadcrumb={[{ label: t('my_data_page.breadcrumb_home'), path: '/' }, { label: t('my_data_page.breadcrumb_label') }]}>
        <div className="text-center loading-pad-lg"><div className="spinner" /></div>
      </Layout>
    )
  }

  return (
    <Layout title={t('my_data_page.page_title')} breadcrumb={[{ label: t('my_data_page.breadcrumb_home'), path: '/' }, { label: t('my_data_page.breadcrumb_label') }]}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('my_data_page.heading')}</h1>
            <p>{t('my_data_page.description')}</p>
          </div>
          <div className="unified-page-header-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
            >
              {exporting === 'csv' ? t('my_data_page.btn_export_csv_loading') : t('my_data_page.btn_export_csv')}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleExport('json')}
              disabled={exporting !== null}
            >
              {exporting === 'json' ? t('my_data_page.btn_export_json_loading') : t('my_data_page.btn_export_json')}
            </button>
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="unified-card">
          <p className="text-center text-secondary">{t('my_data_page.no_data')}</p>
        </div>
      ) : (
        <div className="rgpd-data-sections">
          {sections.map((s) => (
            <div key={s.section} className="unified-card rgpd-data-section">
              <div className="rgpd-data-section-header">
                <h3>{s.section}</h3>
                <span className="rgpd-badge">{s.count} {s.count > 1 ? t('my_data_page.record_plural') : t('my_data_page.record_singular')}</span>
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
        <h3>{t('my_data_page.manage_preferences_title')}</h3>
        <p>{t('my_data_page.manage_preferences_description')}</p>
        <Link to="/rgpd/consent" className="btn btn-secondary btn-sm">
          {t('my_data_page.btn_consent_preferences')}
        </Link>
      </div>

      <div className="unified-card rgpd-rights-cta">
        <h3>{t('my_data_page.exercise_rights_title')}</h3>
        <p>{t('my_data_page.exercise_rights_description')}</p>
        <Link to="/rgpd/rights" className="btn btn-primary btn-sm">
          {t('my_data_page.btn_make_request')}
        </Link>
      </div>
    </Layout>
  )
}
