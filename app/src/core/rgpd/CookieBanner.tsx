import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import api from '../../api'
import { CONSENT_KEY, cleanupFunctionalStorage } from './consentManager'
import './rgpd.scss'

export default function CookieBanner() {
  const { t } = useTranslation('rgpd')
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
          <strong>{t('cookie_banner.title')}</strong>
          <p>
            {t('cookie_banner.description')}{' '}
            <Link to="/rgpd/legal/cookie-policy" className="cookie-banner-link">
              {t('cookie_banner.link_learn_more')}
            </Link>
          </p>
        </div>
        <div className="cookie-banner-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleRejectOptional}>
            {t('cookie_banner.btn_reject_optional')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleAccept}>
            {t('cookie_banner.btn_accept_all')}
          </button>
        </div>
      </div>
    </div>
  )
}
