import { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router'
import { useAuth } from './core/AuthContext'
import { useFeature } from './core/FeatureContext'
import { usePermission } from './core/PermissionContext'
import ProtectedRoute from './core/ProtectedRoute'
import MeshBackground from './core/MeshBackground'
import BackgroundThemePicker from './core/BackgroundThemePicker'
import { CommandPaletteProvider } from './core/search/CommandPaletteProvider'

const TutorialWrapper = lazy(() => import('./core/preference/didacticiel/TutorialWrapper'))
const CookieBanner = lazy(() => import('./core/rgpd/CookieBanner'))
const OnboardingOverlay = lazy(() => import('./core/onboarding/OnboardingOverlay'))
const MaintenanceGuard = lazy(() => import('./core/maintenance_mode/MaintenanceGuard'))
const DashboardPage = lazy(() => import('./core/dashboard/DashboardPage'))

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
import CommandsAdminPage from './core/_identity/CommandsAdminPage'
import CommandHistoryPage from './core/_identity/CommandHistoryPage'
import AcceptLegalPage from './core/rgpd/AcceptLegalPage'
import SSOCallbackPage from './core/sso/SSOCallbackPage'

// Feature manifests (auto-discovered from core + project features)
const coreModules = import.meta.glob('./core/*/index.ts', { eager: true }) as Record<string, any>
const projectModules = import.meta.glob('./features/*/index.ts', { eager: true }) as Record<string, any>
const featureModules = { ...coreModules, ...projectModules }

function LogoutRoute() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    logout().then(() => navigate('/login', { replace: true }))
  }, [logout, navigate])
  return <div className="loading-screen"><div className="spinner" /></div>
}

function LoginSkeleton() {
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="skeleton skeleton-circle skeleton-avatar-lg" />
          <div className="skeleton skeleton-text skeleton-text-lg" />
          <div className="skeleton skeleton-text skeleton-text-sm" />
        </div>
        <div className="skeleton-form">
          <div className="skeleton skeleton-text skeleton-text-xs" />
          <div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-text skeleton-text-xs" />
          <div className="skeleton skeleton-input" />
          <div className="skeleton skeleton-btn" />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading: authLoading, getPreference } = useAuth()
  const { isActive, loading: featuresLoading } = useFeature()
  const { can } = usePermission()
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const anyLoading = authLoading || featuresLoading
  useEffect(() => {
    if (!anyLoading) return
    const id = setTimeout(() => setTimedOut(true), 1500)
    return () => clearTimeout(id)
  }, [anyLoading])

  const themeFeatureAvailable = !!user && isActive('preference.theme')

  useEffect(() => {
    if (!themeFeatureAvailable) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault()
        setShowBgPicker(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [themeFeatureAvailable])

  // Collect routes from active features
  const featureRoutes: Array<{
    path: string
    component: React.LazyExoticComponent<any>
    permission?: string
    feature?: string
    public?: boolean
  }> = []

  if (!anyLoading || timedOut) {
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
      <Route path="/sso/callback/:provider" element={<SSOCallbackPage />} />
      <Route path="/logout" element={<LogoutRoute />} />
      <Route path="/change-password" element={user ? <ForceChangePasswordPage /> : <Navigate to="/login" />} />
      <Route path="/accept-legal" element={user ? <AcceptLegalPage /> : <Navigate to="/login" />} />

      {/* Core protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          {isActive('dashboard') ? (
            <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
              <DashboardPage />
            </Suspense>
          ) : (
            <HomePage />
          )}
        </ProtectedRoute>
      } />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute permission="users.read"><UsersAdminPage /></ProtectedRoute>} />
      <Route path="/admin/users/:uuid" element={<ProtectedRoute permission="users.read"><UserDetailPage /></ProtectedRoute>} />
      <Route path="/admin/database" element={<ProtectedRoute permission="backups.read"><DatabaseAdminPage /></ProtectedRoute>} />
      <Route path="/admin/roles" element={<ProtectedRoute permission="roles.read"><RolesAdminPage /></ProtectedRoute>} />
      <Route path="/admin/permissions" element={<ProtectedRoute permission="permissions.read"><PermissionsAdminPage /></ProtectedRoute>} />
      <Route path="/admin/features" element={<ProtectedRoute permission="features.read"><FeaturesAdminPage /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute permission="settings.read"><AppSettingsAdminPage /></ProtectedRoute>} />
      <Route path="/admin/commands" element={<ProtectedRoute permission="commands.read"><CommandsAdminPage /></ProtectedRoute>} />
      <Route path="/admin/commands/history" element={<ProtectedRoute permission="commands.read"><CommandHistoryPage /></ProtectedRoute>} />

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

      {/* Catch-all: show spinner while contexts load (prevents redirect on HMR reload), then redirect */}
      <Route path="*" element={
        anyLoading && !timedOut
          ? <div className="loading-screen"><div className="spinner" /></div>
          : <Navigate to="/" replace />
      } />
    </Routes>
  )

  return (
    <>
      <MeshBackground randomOnLoad={!user} />
      {themeFeatureAvailable && (
        <BackgroundThemePicker
          isOpen={showBgPicker}
          onClose={() => setShowBgPicker(false)}
        />
      )}
      <CommandPaletteProvider>
        <Suspense fallback={<LoginSkeleton />}>
          {isActive('maintenance_mode') ? (
            <MaintenanceGuard canBypass={can('maintenance_mode.manage')}>
              {user && isActive('preference.didacticiel') ? (
                <TutorialWrapper>{routes}</TutorialWrapper>
              ) : routes}
            </MaintenanceGuard>
          ) : (
            user && isActive('preference.didacticiel') ? (
              <TutorialWrapper>{routes}</TutorialWrapper>
            ) : routes
          )}
        </Suspense>
      </CommandPaletteProvider>
      {isActive('rgpd.consentement') && (
        <Suspense fallback={null}>
          <CookieBanner />
        </Suspense>
      )}
      {user && isActive('onboarding') && getPreference('onboarding_completed') !== true && (
        <Suspense fallback={null}>
          <OnboardingOverlay />
        </Suspense>
      )}
    </>
  )
}
