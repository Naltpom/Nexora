import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { cleanupFunctionalStorage } from './consentManager'
import './rgpd.scss'

const CONSENT_KEY = 'rgpd_consent_given'

export default function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const given = localStorage.getItem(CONSENT_KEY)
    if (!given) {
      setShow(true)
    }
  }, [])

  const handleAccept = async () => {
    const consents = [
      { consent_type: 'necessary', granted: true },
      { consent_type: 'functional', granted: true },
      { consent_type: 'analytics', granted: true },
      { consent_type: 'marketing', granted: false },
    ]
    try {
      await api.post('/rgpd/consent/', { consents })
    } catch {
      // silently fail for anonymous users
    }
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      necessary: true, functional: true, analytics: true, marketing: false,
      date: new Date().toISOString(),
    }))
    setShow(false)
  }

  const handleRejectOptional = async () => {
    const consents = [
      { consent_type: 'necessary', granted: true },
      { consent_type: 'functional', granted: false },
      { consent_type: 'analytics', granted: false },
      { consent_type: 'marketing', granted: false },
    ]
    try {
      await api.post('/rgpd/consent/', { consents })
    } catch {
      // silently fail
    }
    localStorage.setItem(CONSENT_KEY, JSON.stringify({
      necessary: true, functional: false, analytics: false, marketing: false,
      date: new Date().toISOString(),
    }))
    cleanupFunctionalStorage()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="cookie-banner">
      <div className="cookie-banner-content">
        <div className="cookie-banner-text">
          <strong>Nous respectons votre vie privee</strong>
          <p>
            Ce site utilise des cookies et traceurs pour fonctionner correctement et ameliorer votre experience.
            Vous pouvez accepter tous les cookies et traceurs ou n'accepter que ceux strictement necessaires.{' '}
            <Link to="/rgpd/legal/cookie-policy" className="cookie-banner-link">
              En savoir plus
            </Link>
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleRejectOptional}>
            Refuser les optionnels
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleAccept}>
            Tout accepter
          </button>
        </div>
      </div>
    </div>
  )
}
