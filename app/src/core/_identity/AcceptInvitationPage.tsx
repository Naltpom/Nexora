import { useState, useEffect, FormEvent, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../core/AuthContext'

type Step = 'loading' | 'invalid' | 'form' | 'verify' | 'success'

interface InvitationInfo {
  inviter_name: string
  email: string
  user_exists: boolean
  expires_at: string
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [step, setStep] = useState<Step>('loading')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [error, setError] = useState('')

  // Form fields for existing user
  const [password, setPassword] = useState('')

  // Form fields for new user
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Verification code
  const [verificationCode, setVerificationCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    validateToken()
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    }
  }, [token])

  const validateToken = async () => {
    try {
      const response = await api.get(`/invitations/${token}`)
      setInvitation(response.data)
      setStep('form')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invitation invalide ou expiree')
      setStep('invalid')
    }
  }

  const startCooldown = () => {
    setResendCooldown(60)
    if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    cooldownInterval.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let payload: any
      if (invitation?.user_exists) {
        payload = { password }
      } else {
        if (newPassword !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas')
          setSubmitting(false)
          return
        }
        if (newPassword.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caracteres')
          setSubmitting(false)
          return
        }
        payload = {
          first_name: firstName,
          last_name: lastName,
          password: newPassword,
        }
      }

      await api.post(`/invitations/${token}/accept`, payload)
      setStep('verify')
      startCooldown()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    try {
      await api.post(`/invitations/${token}/send-code`)
      startCooldown()
    } catch (err: any) {
      setVerifyError(err.response?.data?.detail || 'Erreur lors du renvoi')
    }
  }

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setVerifyError('')
    setSubmitting(true)

    try {
      const response = await api.post(`/invitations/${token}/verify`, { code: verificationCode })
      const { access_token, refresh_token } = response.data

      // Store tokens
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      // Refresh user context so ProtectedRoute knows we're authenticated
      await refreshUser()

      setStep('success')

      // Redirect after 2 seconds
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setVerifyError(err.response?.data?.detail || 'Code incorrect')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (step === 'loading') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '20px auto' }} />
            <p>Verification de l'invitation...</p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid token
  if (step === 'invalid') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Invitation invalide</h1>
          </div>
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 16 }}>
            Cette invitation n'est plus valide. Elle a peut-etre expire ou a deja ete utilisee.
          </p>
          <Link to="/login" className="btn btn-primary btn-block">
            Retour a la connexion
          </Link>
        </div>
      </div>
    )
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1>Bienvenue !</h1>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--gray-500)', marginBottom: 16 }}>
            Vous avez accepte l'invitation avec succes.
          </p>
          <p style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
            Redirection en cours...
          </p>
        </div>
      </div>
    )
  }

  // Verification code step
  if (step === 'verify') {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>Verification</h1>
            <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
              Un code de verification a ete envoye a <strong>{invitation?.email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyCode}>
            {verifyError && <div className="alert alert-error">{verifyError}</div>}

            <div className="form-group">
              <label>Code de verification</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                style={{
                  textAlign: 'center',
                  fontSize: 24,
                  letterSpacing: 8,
                  fontWeight: 600,
                }}
                required
                autoFocus
                disabled={submitting}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting || verificationCode.length !== 6}>
              {submitting ? 'Verification...' : 'Valider'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? 'var(--gray-400)' : 'var(--primary)',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {resendCooldown > 0
                  ? `Renvoyer le code (${resendCooldown}s)`
                  : 'Renvoyer le code'}
              </button>
            </div>

            <p style={{ color: 'var(--gray-400)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
              Le code est valable 5 minutes.
            </p>
          </form>
        </div>
      </div>
    )
  }

  // Form step (existing user or new user)
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 20,
              margin: '0 auto 16px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1>Invite par {invitation?.inviter_name}</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {invitation?.user_exists
              ? 'Connectez-vous pour accepter l\'invitation'
              : 'Creez votre compte pour continuer'}
          </p>
        </div>

        <form onSubmit={handleSubmitForm}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              style={{ background: 'var(--gray-100)' }}
            />
          </div>

          {invitation?.user_exists ? (
            // Existing user - just needs password
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                autoFocus
                disabled={submitting}
              />
            </div>
          ) : (
            // New user - needs full registration
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Prenom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    required
                    autoFocus
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caracteres"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer le mot de passe"
                  required
                  disabled={submitting}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Chargement...' : invitation?.user_exists ? 'Se connecter' : 'Creer mon compte'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            Annuler et retourner a la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
