import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext'
import api from '../../api'
import './mfa.css'

export default function MFAForceSetupPage() {
  const navigate = useNavigate()
  const { clearMfaSetupRequired, logout } = useAuth()

  const [loading, setLoading] = useState(true)
  const [availableMethods, setAvailableMethods] = useState<string[]>([])
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // TOTP
  const [totpSetupData, setTotpSetupData] = useState<{ qr_code_base64: string; secret: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [totpSaving, setTotpSaving] = useState(false)

  // Email
  const [emailSaving, setEmailSaving] = useState(false)

  const fetchMethods = useCallback(async () => {
    try {
      const res = await api.get('/mfa/methods')
      const methods = (res.data.methods || [])
        .filter((m: any) => m.enabled)
        .map((m: any) => m.name)
      setAvailableMethods(methods)
    } catch {
      setAvailableMethods(['totp', 'email'])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  const onSetupComplete = () => {
    clearMfaSetupRequired()
    setSuccessMessage('MFA configure avec succes !')
    setTimeout(() => navigate('/'), 1500)
  }

  // TOTP
  const handleTotpSetup = async () => {
    setTotpError('')
    setTotpSaving(true)
    try {
      const res = await api.post('/mfa/totp/setup')
      setTotpSetupData(res.data)
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || 'Erreur')
    } finally {
      setTotpSaving(false)
    }
  }

  const handleTotpVerify = async () => {
    if (!totpCode || totpCode.length !== 6) {
      setTotpError('Entrez un code a 6 chiffres')
      return
    }
    setTotpError('')
    setTotpSaving(true)
    try {
      await api.post('/mfa/totp/verify-setup', { code: totpCode })
      onSetupComplete()
    } catch (err: any) {
      setTotpError(err.response?.data?.detail || 'Code invalide')
    } finally {
      setTotpSaving(false)
    }
  }

  // Email
  const handleEmailEnable = async () => {
    setEmailSaving(true)
    try {
      await api.post('/mfa/email/enable')
      onSetupComplete()
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de l'activation")
    } finally {
      setEmailSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: 480 }}>
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning, #D97706)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h1 style={{ fontSize: 20 }}>Configuration MFA requise</h1>
          <p style={{ fontSize: 14 }}>
            Votre politique de securite exige la configuration de l'authentification multi-facteurs pour continuer.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}

        {!successMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* TOTP */}
            {availableMethods.includes('totp') && (
              <div style={{ padding: 16, border: '1px solid var(--gray-200)', borderRadius: 12, background: 'var(--gray-50)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Application d'authentification (TOTP)</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                  Google Authenticator, Authy, ou similaire.
                </p>

                {totpError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{totpError}</div>}

                {!totpSetupData ? (
                  <button className="btn btn-primary" onClick={handleTotpSetup} disabled={totpSaving}>
                    {totpSaving ? 'Chargement...' : 'Configurer TOTP'}
                  </button>
                ) : (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <img
                        src={`data:image/png;base64,${totpSetupData.qr_code_base64}`}
                        alt="QR Code TOTP"
                        style={{ width: 180, height: 180, borderRadius: 8 }}
                      />
                    </div>
                    <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--gray-500)' }}>
                      Cle : <code style={{ wordBreak: 'break-all' }}>{totpSetupData.secret}</code>
                    </div>
                    <div className="form-group">
                      <label>Code de verification</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={handleTotpVerify} disabled={totpSaving || totpCode.length !== 6}>
                        {totpSaving ? 'Verification...' : 'Confirmer'}
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setTotpSetupData(null); setTotpCode(''); setTotpError('') }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Email */}
            {availableMethods.includes('email') && (
              <div style={{ padding: 16, border: '1px solid var(--gray-200)', borderRadius: 12, background: 'var(--gray-50)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Verification par email</h3>
                <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                  Recevez un code par email a chaque connexion.
                </p>
                <button className="btn btn-primary" onClick={handleEmailEnable} disabled={emailSaving}>
                  {emailSaving ? 'Activation...' : 'Activer la verification email'}
                </button>
              </div>
            )}

            {availableMethods.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>
                Aucune methode MFA disponible. Contactez votre administrateur.
              </p>
            )}
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={() => { logout(); navigate('/login') }}
          style={{ marginTop: 16, width: '100%' }}
        >
          Se deconnecter
        </button>
      </div>
    </div>
  )
}
