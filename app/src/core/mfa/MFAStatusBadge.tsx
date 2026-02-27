import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import './mfa.scss'

interface MFAStatusResponse {
  is_mfa_enabled: boolean
  mfa_required_by_policy: boolean
  mfa_setup_required: boolean
}

export default function MFAStatusBadge() {
  const { t } = useTranslation('mfa')
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
    return <span className="mfa-badge mfa-badge-active" aria-label={t('badge_aria_active')}>{t('badge_active')}</span>
  }

  if (status.mfa_required_by_policy) {
    return <span className="mfa-badge mfa-badge-required" aria-label={t('badge_aria_required')}>{t('badge_required')}</span>
  }

  return <span className="mfa-badge mfa-badge-inactive" aria-label={t('badge_aria_inactive')}>{t('badge_inactive')}</span>
}
