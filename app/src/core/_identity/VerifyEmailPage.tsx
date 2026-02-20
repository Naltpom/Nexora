import { useState, useEffect, FormEvent, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../core/AuthContext'
import './_identity.scss'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshUser } = useAuth()

  const email = (location.state as any)?.email || ''
  const initialDebugCode = (location.state as any)?.debugCode || null

  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(60)
  const [success, setSuccess] = useState(false)
  const [debugCode, setDebugCode] = useState<string | null>(initialDebugCode)

  const cooldownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!email) {
      navigate('/register')
      return
    }
    startCooldown()
    return () => {
      if (cooldownInterval.current) clearInterval(cooldownInterval.current)
    }
  }, [])

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

  const handleResendCode = async () => {
    if (resendCooldown > 0) return
    try {
      const response = await api.post('/auth/resend-verification', { email })
      if (response.data.debug_code) {
        setDebugCode(response.data.debug_code)
      }
      startCooldown()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du renvoi')
    }
  }

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await api.post('/auth/verify-email', { email, code: verificationCode })
      const { access_token, refresh_token } = response.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      await refreshUser()
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Code incorrect')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="avatar-circle-lg">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1>Email verifie !</h1>
          </div>
          <p className="text-center text-gray-500 mb-16">
            Votre compte a ete active avec succes.
          </p>
          <p className="text-center text-gray-500">
            Redirection en cours...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#1E40AF" />
            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">K</text>
          </svg>
          <h1>Verification de l'email</h1>
          <p className="text-gray-500">
            Un code de verification a ete envoye a <strong>{email}</strong>
          </p>
        </div>

        {debugCode && (
          <div className="verify-debug-box">
            <span className="verify-debug-label">MODE DEV — Code :</span>
            <span className="verify-debug-code">{debugCode}</span>
          </div>
        )}

        <form onSubmit={handleVerifyCode}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Code de verification</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="verify-code-input"
              required
              autoFocus
              disabled={submitting}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting || verificationCode.length !== 6}>
            {submitting ? 'Verification...' : 'Valider'}
          </button>

          <div className="text-center mt-16">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0}
              className={resendCooldown > 0 ? 'verify-resend-btn verify-resend-btn--disabled' : 'verify-resend-btn verify-resend-btn--active'}
            >
              {resendCooldown > 0
                ? `Renvoyer le code (${resendCooldown}s)`
                : 'Renvoyer le code'}
            </button>
          </div>

          <p className="text-muted text-center mt-16">
            Le code est valable 5 minutes.
          </p>
        </form>

        <div className="login-footer">
          <Link to="/login" className="link-primary text-gray-500">
            Retourner a la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
