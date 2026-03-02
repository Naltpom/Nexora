import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router'
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

const SLUG_META_DESCRIPTION_KEYS: Record<string, string> = {
  'privacy-policy': 'legal_page.meta_privacy_policy',
  'terms': 'legal_page.meta_terms',
  'legal-notice': 'legal_page.meta_legal_notice',
  'cookie-policy': 'legal_page.meta_cookie_policy',
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

  // SEO: set document.title and meta description for public page
  useEffect(() => {
    if (page) {
      document.title = page.title
      let meta = document.querySelector('meta[name="description"]')
      const descKey = SLUG_META_DESCRIPTION_KEYS[slug || '']
      if (descKey) {
        const content = t(descKey)
        if (!meta) {
          meta = document.createElement('meta')
          meta.setAttribute('name', 'description')
          document.head.appendChild(meta)
        }
        meta.setAttribute('content', content)
      }
    } else if (notFound) {
      const titleKey = SLUG_TITLE_KEYS[slug || '']
      document.title = titleKey ? t(titleKey) : t('legal_page.default_title')
    }

    return () => {
      document.title = ''
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', '')
    }
  }, [page, notFound, slug, t])

  if (loading) {
    return (
      <div className="rgpd-legal-page">
        <div className="rgpd-legal-container" aria-busy="true">
          <div className="text-center loading-pad-lg"><div className="spinner" role="status"><span className="sr-only">{t('legal_page.aria_loading')}</span></div></div>
        </div>
      </div>
    )
  }

  if (notFound || !page) {
    const titleKey = SLUG_TITLE_KEYS[slug || '']
    return (
      <div className="rgpd-legal-page">
        <main className="rgpd-legal-container">
          <h1>{titleKey ? t(titleKey) : t('legal_page.default_title')}</h1>
          <p className="text-secondary">{t('legal_page.not_available')}</p>
          <Link to="/" className="btn btn-primary btn-sm">{t('legal_page.btn_back_home')}</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="rgpd-legal-page">
      <main className="rgpd-legal-container">
        <article>
          <h1>{page.title}</h1>
          <div className="rgpd-legal-meta">
            <time dateTime={page.updated_at}>{t('legal_page.last_updated')} {new Date(page.updated_at).toLocaleDateString('fr-FR')}</time>
            {' — '}{t('legal_page.version_label')} {page.version}
          </div>
          <div
            className="rgpd-legal-content"
            dangerouslySetInnerHTML={{ __html: page.content_html }}
          />
        </article>
        <nav className="rgpd-legal-footer" aria-label={t('legal_page.aria_nav_back')}>
          <Link to="/" className="btn btn-secondary btn-sm">{t('legal_page.btn_back_home')}</Link>
        </nav>
      </main>
    </div>
  )
}
