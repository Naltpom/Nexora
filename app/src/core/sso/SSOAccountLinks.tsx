import { useEffect, useState } from 'react'
import api from '../../api'
import './sso.css'

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
      <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
        Chargement...
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Linked accounts */}
      {accounts.length > 0 && (
        <div className="sso-accounts-list">
          {accounts.map((account) => (
            <div key={account.id} className="sso-account-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                {account.provider_avatar_url ? (
                  <img
                    src={account.provider_avatar_url}
                    alt=""
                    className="sso-provider-icon"
                    style={{ borderRadius: '50%' }}
                  />
                ) : (
                  <div
                    className="sso-provider-icon"
                    style={{
                      borderRadius: '50%',
                      background: 'var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {account.provider.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {account.provider}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {account.provider_email}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Lie le {formatDate(account.created_at)}
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleUnlink(account)}
                disabled={unlinkingId === account.id}
                style={{ flexShrink: 0, fontSize: 12 }}
              >
                {unlinkingId === account.id ? 'Suppression...' : 'Delier'}
              </button>
            </div>
          ))}
        </div>
      )}

      {accounts.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
          Aucun compte externe lie.
        </p>
      )}

      {/* Link new providers */}
      {unlinkableProviders.length > 0 && (
        <div style={{ marginTop: accounts.length > 0 ? 16 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Lier un nouveau compte
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {unlinkableProviders.map((p) => (
              <button
                key={p.name}
                className="btn btn-secondary"
                onClick={() => handleLink(p.name)}
                disabled={linkingProvider !== null}
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
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
