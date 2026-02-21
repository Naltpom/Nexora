import { useState, useEffect } from 'react'
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

const SLUG_TITLES: Record<string, string> = {
  'privacy-policy': 'Politique de confidentialite',
  'terms': 'Conditions generales d\'utilisation',
  'legal-notice': 'Mentions legales',
  'cookie-policy': 'Politique de cookies et traceurs',
}

export default function LegalPage() {
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
    return (
      <div className="rgpd-legal-page">
        <div className="rgpd-legal-container">
          <h1>{SLUG_TITLES[slug || ''] || 'Page legale'}</h1>
          <p className="text-secondary">Cette page n'est pas encore disponible.</p>
          <Link to="/" className="btn btn-primary btn-sm">Retour a l'accueil</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rgpd-legal-page">
      <div className="rgpd-legal-container">
        <h1>{page.title}</h1>
        <div className="rgpd-legal-meta">
          Derniere mise a jour : {new Date(page.updated_at).toLocaleDateString('fr-FR')}
          {' — '}Version {page.version}
        </div>
        <div
          className="rgpd-legal-content"
          dangerouslySetInnerHTML={{ __html: page.content_html }}
        />
        <div className="rgpd-legal-footer">
          <Link to="/" className="btn btn-secondary btn-sm">Retour a l'accueil</Link>
        </div>
      </div>
    </div>
  )
}
