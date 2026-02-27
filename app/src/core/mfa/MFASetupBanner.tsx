import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'
import '../_identity/_identity.scss'
import './mfa.scss'

export default function MFASetupBanner() {
  const { t } = useTranslation('mfa')
  const navigate = useNavigate()
  const { isMfaSetupRequired, getMfaGraceExpires } = useAuth()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('mfa_banner_dismissed') === 'true')

  const expires = getMfaGraceExpires()
  const isExpired = expires ? new Date() >= expires : false

  // Mid-session enforcement: redirect to force-setup when grace period expires
  useEffect(() => {
    if (isMfaSetupRequired() && isExpired) {
      navigate('/mfa/force-setup', { replace: true })
    }
  }, [isMfaSetupRequired, isExpired, navigate])

  if (dismissed || !isMfaSetupRequired()) return null
  if (!expires || isExpired) return null

  const formattedDate = expires.toLocaleDateString(i18next.language || 'fr', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const handleDismiss = () => {
    sessionStorage.setItem('mfa_banner_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="mfa-setup-banner" role="alert" aria-label={t('banner_aria_label')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>
        {t('banner_message_before_date')} <strong>{formattedDate}</strong>.
      </span>
      <Link
        to="/profile/mfa"
        className="mfa-setup-banner-link"
      >
        {t('banner_configure_now')}
      </Link>
      <button
        onClick={handleDismiss}
        className="mfa-setup-banner-dismiss"
        title={t('banner_dismiss_title')}
        aria-label={t('banner_dismiss_aria')}
      >
        &times;
      </button>
    </div>
  )
}
