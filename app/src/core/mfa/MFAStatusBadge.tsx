import { useState, useEffect } from 'react'
import api from '../../api'
import './mfa.scss'

interface MFAStatusResponse {
  is_mfa_enabled: boolean
  mfa_required_by_policy: boolean
  mfa_setup_required: boolean
}

export default function MFAStatusBadge() {
  const [status, setStatus] = useState<MFAStatusResponse | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/mfa/status')
        setStatus(res.data)
      } catch {
        // Silently fail if MFA status is not available
      }
    }
    fetchStatus()
  }, [])

  if (!status) return null

  if (status.is_mfa_enabled) {
    return <span className="mfa-badge mfa-badge-active">MFA actif</span>
  }

  if (status.mfa_required_by_policy) {
    return <span className="mfa-badge mfa-badge-required">MFA requis</span>
  }

  return <span className="mfa-badge mfa-badge-inactive">MFA inactif</span>
}
