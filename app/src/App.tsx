import { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './core/AuthContext'
import { useFeature } from './core/FeatureContext'
import ProtectedRoute from './core/ProtectedRoute'
import MeshBackground from './core/MeshBackground'
import BackgroundThemePicker from './core/BackgroundThemePicker'

// Core pages (always available)
import LoginPage from './features/_core/LoginPage'
import RegisterPage from './features/_core/RegisterPage'
import ForceChangePasswordPage from './features/_core/ForceChangePasswordPage'
import ResetPasswordPage from './features/_core/ResetPasswordPage'
import ForgotPasswordPage from './features/_core/ForgotPasswordPage'
import AcceptInvitationPage from './features/_core/AcceptInvitationPage'
import HomePage from './features/_core/HomePage'
import ProfilePage from './features/_core/ProfilePage'
import UsersAdminPage from './features/_core/UsersAdminPage'
import DatabaseAdminPage from './features/_core/DatabaseAdminPage'
import RolesAdminPage from './features/_core/RolesAdminPage'
import PermissionsAdminPage from './features/_core/PermissionsAdminPage'
import FeaturesAdminPage from './features/_core/FeaturesAdminPage'
import AppSettingsAdminPage from './features/_core/AppSettingsAdminPage'

// Feature manifests (auto-discovered)
const featureModules = import.meta.glob('./features/*/index.ts', { eager: true }) as Record<string, any>

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
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
          <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/invitation/:token" element={<AcceptInvitationPage />} />
          <Route path="/change-password" element={user ? <ForceChangePasswordPage /> : <Navigate to="/login" />} />

          {/* Core protected routes */}
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireSuperAdmin><UsersAdminPage /></ProtectedRoute>} />
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
                <ProtectedRoute permission={route.permission} feature={route.feature}>
                  <route.component />
                </ProtectedRoute>
              }
            />
          ))}
        </Routes>
      </Suspense>
    </>
  )
}
