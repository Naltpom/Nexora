import { Navigate, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'
import { usePermission } from './PermissionContext'
import { useFeature } from './FeatureContext'

interface Props {
  children: React.ReactNode
  requireSuperAdmin?: boolean
  permission?: string
  feature?: string
  isPublic?: boolean
}

export default function ProtectedRoute({ children, requireSuperAdmin = false, permission, feature, isPublic = false }: Props) {
  const { t } = useTranslation('common')
  const { user, loading, isImpersonating, isMfaSetupRequired, getMfaGraceExpires } = useAuth()
  const { can } = usePermission()
  const { isActive } = useFeature()
  const location = useLocation()

  // Public feature routes only check if the feature is active
  if (isPublic) {
    if (feature && !isActive(feature)) {
      return <Navigate to="/" replace />
    }
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>{t('loading')}</p>
      </div>
    )
  }

  if (!user) {
    const returnTo = location.pathname + location.search
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />
  }

  // Skip RGPD + MFA enforcement during impersonation
  if (!isImpersonating) {
    // Legal documents acceptance
    if (user.pending_legal_acceptances?.length) {
      return <Navigate to="/accept-legal" replace />
    }

    // MFA setup enforcement after grace period
    if (isMfaSetupRequired()) {
      const expires = getMfaGraceExpires()
      if (expires && new Date() >= expires) {
        return <Navigate to="/mfa/force-setup" replace />
      }
    }
  }

  if (requireSuperAdmin && !can('users.read')) {
    return <Navigate to="/" replace />
  }

  if (feature && !isActive(feature)) {
    return <Navigate to="/" replace />
  }

  if (permission && !can(permission)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
