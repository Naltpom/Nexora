import { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './core/AuthContext'
import { useFeature } from './core/FeatureContext'
import ProtectedRoute from './core/ProtectedRoute'
import MeshBackground from './core/MeshBackground'
import BackgroundThemePicker from './core/BackgroundThemePicker'

const TutorialWrapper = lazy(() => import('./core/preference/didacticiel/TutorialWrapper'))

// Identity pages (always available)
import LoginPage from './core/_identity/LoginPage'
import RegisterPage from './core/_identity/RegisterPage'
import ForceChangePasswordPage from './core/_identity/ForceChangePasswordPage'
import ResetPasswordPage from './core/_identity/ResetPasswordPage'
import ForgotPasswordPage from './core/_identity/ForgotPasswordPage'
import AcceptInvitationPage from './core/_identity/AcceptInvitationPage'
import VerifyEmailPage from './core/_identity/VerifyEmailPage'
import HomePage from './core/_identity/HomePage'
import ProfilePage from './core/_identity/ProfilePage'
import UsersAdminPage from './core/_identity/UsersAdminPage'
import DatabaseAdminPage from './core/_identity/DatabaseAdminPage'
import RolesAdminPage from './core/_identity/RolesAdminPage'
import PermissionsAdminPage from './core/_identity/PermissionsAdminPage'
import FeaturesAdminPage from './core/_identity/FeaturesAdminPage'
import AppSettingsAdminPage from './core/_identity/AppSettingsAdminPage'
import UserDetailPage from './core/_identity/UserDetailPage'

// Feature manifests (auto-discovered from core + project features)
const coreModules = import.meta.glob('./core/*/index.ts', { eager: true }) as Record<string, any>
const projectModules = import.meta.glob('./features/*/index.ts', { eager: true }) as Record<string, any>
const featureModules = { ...coreModules, ...projectModules }

function LoadingSpinner() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>Chargement...</p>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const { isActive } = useFeature()
  const [showBgPicker, setShowBgPicker] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        setShowBgPicker(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (loading) {
    return <LoadingSpinner />
  }

  // Collect routes from active features
  const featureRoutes: Array<{
    path: string
    component: React.LazyExoticComponent<any>
    permission?: string
    feature?: string
    public?: boolean
  }> = []

  for (const [, mod] of Object.entries(featureModules)) {
    const manifest = (mod as any).manifest
    if (!manifest || !isActive(manifest.name)) continue

    for (const route of manifest.routes || []) {
      featureRoutes.push({
        ...route,
        feature: manifest.name,
      })
    }
  }

  const routes = (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={user ? <Navigate to="/" /> : <VerifyEmailPage />} />
      <Route path="/invitation/:token" element={<AcceptInvitationPage />} />
      <Route path="/change-password" element={user ? <ForceChangePasswordPage /> : <Navigate to="/login" />} />

      {/* Core protected routes */}
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><UsersAdminPage /></ProtectedRoute>} />
      <Route path="/admin/users/:uuid" element={<ProtectedRoute requireSuperAdmin><UserDetailPage /></ProtectedRoute>} />
      <Route path="/admin/database" element={<ProtectedRoute requireSuperAdmin><DatabaseAdminPage /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute requireSuperAdmin><RolesAdminPage /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute requireSuperAdmin><PermissionsAdminPage /></ProtectedRoute>} />
      <Route path="/admin/features" element={<ProtectedRoute requireSuperAdmin><FeaturesAdminPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute requireSuperAdmin><AppSettingsAdminPage /></ProtectedRoute>} />

      {/* Dynamic feature routes */}
      {featureRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRoute permission={route.permission} feature={route.feature} isPublic={route.public}>
              <route.component />
            </ProtectedRoute>
          }
        />
      ))}
    </Routes>
  )

  return (
    <>
      <MeshBackground />
      {user && (
        <BackgroundThemePicker
          isOpen={showBgPicker}
          onClose={() => setShowBgPicker(false)}
        />
      )}
      <Suspense fallback={<LoadingSpinner />}>
        {isActive('preference.didacticiel') ? (
          <TutorialWrapper>{routes}</TutorialWrapper>
        ) : routes}
      </Suspense>
    </>
  )
}
