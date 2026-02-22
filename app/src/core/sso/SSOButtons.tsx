import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import './sso.scss'

interface SSOProvider {
  name: string
  label: string
  enabled: boolean
}

const providerIcons: Record<string, JSX.Element> = {
  google: (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  ),
  github: (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
    </svg>
  ),
}

export default function SSOButtons() {
  const { t } = useTranslation('sso')
  const [providers, setProviders] = useState<SSOProvider[]>([])
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await api.get('/sso/providers')
        const all: SSOProvider[] = response.data.providers || []
        setProviders(all.filter(p => p.enabled))
      } catch {
        // SSO providers unavailable - silently fail
      }
    }
    fetchProviders()
  }, [])

  const handleSSO = async (provider: string) => {
    setError(null)
    setLoadingProvider(provider)
    try {
      const response = await api.get(`/sso/${provider}/authorize`)
      window.location.href = response.data.authorization_url
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : t('erreur_connexion_provider', { provider }))
      setLoadingProvider(null)
    }
  }

  if (providers.length === 0) return null

  return (
    <div className="sso-buttons">
      {error && (
        <div className="alert alert-error sso-error-alert">
          {error}
        </div>
      )}
      {providers.map((p) => (
        <button
          key={p.name}
          className={`sso-btn sso-btn-${p.name}`}
          onClick={() => handleSSO(p.name)}
          disabled={loadingProvider !== null}
          type="button"
        >
          {loadingProvider === p.name ? (
            <div className="sso-spinner-small" />
          ) : (
            providerIcons[p.name] || null
          )}
          <span>{t('continuer_avec_provider', { label: p.label })}</span>
        </button>
      ))}
    </div>
  )
}
