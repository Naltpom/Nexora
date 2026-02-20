import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'

export default function MFASetupBanner() {
  const { isMfaSetupRequired, getMfaGraceExpires } = useAuth()
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('mfa_banner_dismissed') === 'true')

  if (dismissed || !isMfaSetupRequired()) return null

  const expires = getMfaGraceExpires()
  if (!expires || new Date() >= expires) return null

  const formattedDate = expires.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const handleDismiss = () => {
    sessionStorage.setItem('mfa_banner_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div style={{
      background: 'var(--warning, #D97706)',
      color: '#fff',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontSize: 14,
      position: 'relative',
      zIndex: 50,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>
        Vous devez configurer l'authentification multi-facteurs avant le <strong>{formattedDate}</strong>.
      </span>
      <Link
        to="/profile/mfa"
        style={{
          color: '#fff',
          fontWeight: 600,
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        Configurer maintenant
      </Link>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 18,
          padding: '0 4px',
          lineHeight: 1,
          opacity: 0.7,
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
        title="Fermer"
      >
        &times;
      </button>
    </div>
  )
}
