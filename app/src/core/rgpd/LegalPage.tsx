import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import api from '../../api'
import './rgpd.scss'

interface LegalPageData {
  slug: string
  title: string
  content_html: string
  version: number
  updated_at: string
}

const SLUG_TITLE_KEYS: Record<string, string> = {
  'privacy-policy': 'legal_page.slug_privacy_policy',
  'terms': 'legal_page.slug_terms',
  'legal-notice': 'legal_page.slug_legal_notice',
  'cookie-policy': 'legal_page.slug_cookie_policy',
}

export default function LegalPage() {
  const { t } = useTranslation('rgpd')
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<LegalPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)
    api.get(`/rgpd/legal/${slug}`)
      .then((res) => setPage(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="rgpd-legal-page">
        <div className="rgpd-legal-container">
          <div className="text-center loading-pad-lg"><div className="spinner" /></div>
        </div>
      </div>
    )
  }

  if (notFound || !page) {
    const titleKey = SLUG_TITLE_KEYS[slug || '']
    return (
      <div className="rgpd-legal-page">
        <div className="rgpd-legal-container">
          <h1>{titleKey ? t(titleKey) : t('legal_page.default_title')}</h1>
          <p className="text-secondary">{t('legal_page.not_available')}</p>
          <Link to="/" className="btn btn-primary btn-sm">{t('legal_page.btn_back_home')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rgpd-legal-page">
      <div className="rgpd-legal-container">
        <h1>{page.title}</h1>
        <div className="rgpd-legal-meta">
          {t('legal_page.last_updated')} {new Date(page.updated_at).toLocaleDateString('fr-FR')}
          {' — '}{t('legal_page.version_label')} {page.version}
        </div>
        <div
          className="rgpd-legal-content"
          dangerouslySetInnerHTML={{ __html: page.content_html }}
        />
        <div className="rgpd-legal-footer">
          <Link to="/" className="btn btn-secondary btn-sm">{t('legal_page.btn_back_home')}</Link>
        </div>
      </div>
    </div>
  )
}
