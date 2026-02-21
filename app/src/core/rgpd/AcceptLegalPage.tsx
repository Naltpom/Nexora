import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useConfirm } from '../ConfirmModal'
import api from '../../api'
import type { PendingLegalAcceptance } from '../../types'
import './rgpd.scss'

export default function AcceptLegalPage() {
  const { user, logout, refreshUser } = useAuth()
  const { confirm } = useConfirm()
  const navigate = useNavigate()

  const pending: PendingLegalAcceptance[] = user?.pending_legal_acceptances || []
  const isUpdate = user?.has_previous_acceptances ?? false

  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step-by-step mode state (existing users)
  const [currentStep, setCurrentStep] = useState(0)
  const [scrolledToBottom, setScrolledToBottom] = useState<Record<string, boolean>>({})

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Reset scroll position when step changes
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTop = 0
    // Check if new document needs scrolling
    const slug = pending[currentStep]?.slug
    if (slug && el.scrollHeight <= el.clientHeight + 10) {
      setScrolledToBottom((prev) => ({ ...prev, [slug]: true }))
    }
  }, [currentStep])

  // Registration mode state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (!pending.length) {
    navigate('/', { replace: true })
    return null
  }

  const allAccepted = pending.every((doc) => accepted[doc.slug])

  const handleScroll = (slug: string) => (e: React.UIEvent<HTMLDivElement>) => {
    if (scrolledToBottom[slug]) return
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToBottom((prev) => ({ ...prev, [slug]: true }))
    }
  }

  const handleToggle = (slug: string) => {
    setAccepted((prev) => ({ ...prev, [slug]: !prev[slug] }))
  }

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post('/rgpd/legal/acceptance/accept', { slugs: pending.map((d) => d.slug) })
      await refreshUser()
      navigate('/', { replace: true })
    } catch {
      setError("Une erreur est survenue. Veuillez reessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleRefuse = () => {
    logout()
    navigate('/login?legal_refused=true', { replace: true })
  }

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: 'Supprimer mon compte',
      message:
        'Votre compte sera desactive pendant 30 jours. Si vous vous reconnectez dans ce delai, il sera automatiquement reactive. Passe ce delai, toutes vos donnees seront definitivement supprimees.\n\nEtes-vous sur de vouloir continuer ?',
      confirmText: 'Oui, supprimer mon compte',
      cancelText: 'Annuler',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await api.delete('/auth/me/account')
    } catch { /* ignore */ }
    logout()
    navigate('/login?account_deleted=true', { replace: true })
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // ── Mode "Mise a jour" : step-by-step, scroll obligatoire ──────────────
  if (isUpdate) {
    const currentDoc = pending[currentStep]
    const isLastStep = currentStep === pending.length - 1
    const canCheck = !!scrolledToBottom[currentDoc.slug]
    const isChecked = !!accepted[currentDoc.slug]

    return (
      <div className="login-container">
        <div className="legal-accept-card">
          <div className="login-header">
            <h1>Mise a jour des documents legaux</h1>
            <p>Des documents legaux ont ete mis a jour. Veuillez les lire et les accepter pour continuer.</p>
            {pending.length > 1 && (
              <div className="legal-step-indicator">
                Document {currentStep + 1} sur {pending.length}
              </div>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="legal-accept-document">
            <div className="legal-accept-document-header">
              <h3>{currentDoc.title}</h3>
              <span className="text-secondary">
                Mis a jour le {formatDate(currentDoc.updated_at)} — Version {currentDoc.version}
              </span>
            </div>
            <div
              ref={scrollContainerRef}
              className="legal-document-scroll"
              onScroll={handleScroll(currentDoc.slug)}
              dangerouslySetInnerHTML={{ __html: currentDoc.content_html }}
            />
            {!canCheck && (
              <p className="legal-scroll-hint">
                Faites defiler jusqu&apos;en bas du document pour pouvoir l&apos;accepter.
              </p>
            )}
            <label className={`legal-accept-checkbox${!canCheck ? ' disabled' : ''}`}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(currentDoc.slug)}
                disabled={!canCheck}
              />
              J&apos;ai lu et j&apos;accepte {currentDoc.title}
            </label>
          </div>

          <div className="legal-accept-actions">
            <div className="legal-accept-actions-left">
              <button className="btn btn-secondary" onClick={handleRefuse}>
                Refuser et se deconnecter
              </button>
              <button className="btn btn-danger" onClick={handleDeleteAccount}>
                Supprimer mon compte
              </button>
            </div>
            {isLastStep ? (
              <button
                className="btn btn-primary"
                onClick={handleAccept}
                disabled={!allAccepted || loading}
              >
                {loading ? 'Validation...' : 'Valider'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!isChecked}
              >
                Suivant
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Mode "Inscription" : compact, checkbox + bouton Voir ───────────────
  return (
    <div className="login-container">
      <div className="legal-accept-card">
        <div className="login-header">
          <h1>Documents legaux</h1>
          <p>Veuillez accepter les documents suivants pour acceder au service.</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="legal-accept-documents">
          {pending.map((doc) => (
            <div key={doc.slug} className="legal-accept-document-compact">
              <div className="legal-accept-compact-row">
                <label className="legal-accept-checkbox">
                  <input
                    type="checkbox"
                    checked={!!accepted[doc.slug]}
                    onChange={() => handleToggle(doc.slug)}
                  />
                  J&apos;accepte {doc.title}
                </label>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setExpanded((prev) => ({ ...prev, [doc.slug]: !prev[doc.slug] }))}
                >
                  {expanded[doc.slug] ? 'Masquer' : 'Voir'}
                </button>
              </div>
              {expanded[doc.slug] && (
                <div
                  className="legal-document-scroll"
                  dangerouslySetInnerHTML={{ __html: doc.content_html }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="legal-accept-actions">
          <div className="legal-accept-actions-left">
            <button className="btn btn-secondary" onClick={handleRefuse}>
              Refuser et se deconnecter
            </button>
            <button className="btn btn-danger" onClick={handleDeleteAccount}>
              Supprimer mon compte
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleAccept}
            disabled={!allAccepted || loading}
          >
            {loading ? 'Validation...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}
