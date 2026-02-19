import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { usePermission } from './PermissionContext'
import { useFeature } from './FeatureContext'

interface Props {
  children: React.ReactNode
  requireSuperAdmin?: boolean
  permission?: string
  feature?: string
}

export default function ProtectedRoute({ children, requireSuperAdmin = false, permission, feature }: Props) {
  const { user, loading } = useAuth()
  const { can } = usePermission()
  const { isActive } = useFeature()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Chargement...</p>
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

  if (requireSuperAdmin && !user.is_super_admin) {
    return <Navigate to="/" replace />
  }

  if (feature && !isActive(feature)) {
    return <Navigate to="/" replace />
  }

  if (permission && !user.is_super_admin && !can(permission)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
