import { useEffect, useState } from 'react'
import api from '../../api'
import './sso.scss'

interface SSOAccount {
  id: number
  provider: string
  provider_email: string | null
  provider_name: string | null
  provider_avatar_url: string | null
  created_at: string
  last_login_at: string | null
}

interface SSOProvider {
  name: string
  label: string
  enabled: boolean
}

export default function SSOAccountLinks() {
  const [accounts, setAccounts] = useState<SSOAccount[]>([])
  const [providers, setProviders] = useState<SSOProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null)
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [accountsRes, providersRes] = await Promise.all([
        api.get('/sso/accounts'),
        api.get('/sso/providers'),
      ])
      setAccounts(accountsRes.data)
      const all: SSOProvider[] = providersRes.data.providers || []
      setProviders(all.filter(p => p.enabled))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Erreur lors du chargement des comptes lies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleUnlink = async (account: SSOAccount) => {
    const confirmed = window.confirm(
      `Voulez-vous vraiment delier votre compte ${account.provider_email || account.provider} (${account.provider}) ?`
    )
    if (!confirmed) return

    setUnlinkingId(account.id)
    try {
      await api.delete(`/sso/accounts/${account.id}`)
      setAccounts(prev => prev.filter(a => a.id !== account.id))
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Erreur lors de la suppression du lien.')
    } finally {
      setUnlinkingId(null)
    }
  }

  const handleLink = async (provider: string) => {
    setError(null)
    setLinkingProvider(provider)
    try {
      const response = await api.get(`/sso/${provider}/authorize`, {
        params: { link: true },
      })
      window.location.href = response.data.authorization_url
    } catch (err: any) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : `Erreur lors de la liaison ${provider}.`)
      setLinkingProvider(null)
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const linkedProviders = new Set(accounts.map(a => a.provider))
  const unlinkableProviders = providers.filter(p => !linkedProviders.has(p.name))

  if (loading) {
    return (
      <div className="sso-loading-state">
        Chargement...
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="alert alert-error sso-alert-spaced">
          {error}
        </div>
      )}

      {/* Linked accounts */}
      {accounts.length > 0 && (
        <div className="sso-accounts-list">
          {accounts.map((account) => (
            <div key={account.id} className="sso-account-item">
              <div className="sso-account-info-row">
                {account.provider_avatar_url ? (
                  <img
                    src={account.provider_avatar_url}
                    alt=""
                    className="sso-provider-icon sso-provider-icon--rounded"
                  />
                ) : (
                  <div className="sso-provider-icon sso-provider-icon--placeholder">
                    {account.provider.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="sso-account-details">
                  <div className="sso-account-provider-name">
                    {account.provider}
                  </div>
                  <div className="sso-account-email">
                    {account.provider_email}
                  </div>
                  <div className="sso-account-date">
                    Lie le {formatDate(account.created_at)}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm sso-unlink-btn"
                onClick={() => handleUnlink(account)}
                disabled={unlinkingId === account.id}
              >
                {unlinkingId === account.id ? 'Suppression...' : 'Delier'}
              </button>
            </div>
          ))}
        </div>
      )}

      {accounts.length === 0 && (
        <p className="sso-empty-message">
          Aucun compte externe lie.
        </p>
      )}

      {/* Link new providers */}
      {unlinkableProviders.length > 0 && (
        <div className={accounts.length > 0 ? 'sso-link-section-spaced' : ''}>
          <div className="sso-link-section-label">
            Lier un nouveau compte
          </div>
          <div className="sso-link-buttons-row">
            {unlinkableProviders.map((p) => (
              <button
                key={p.name}
                className="btn btn-secondary sso-link-btn"
                onClick={() => handleLink(p.name)}
                disabled={linkingProvider !== null}
              >
                {linkingProvider === p.name ? (
                  'Redirection...'
                ) : (
                  <span>Lier {p.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
