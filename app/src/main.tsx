import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './core/AuthContext'
import { PermissionProvider } from './core/PermissionContext'
import { FeatureProvider } from './core/FeatureContext'
import { AppSettingsProvider } from './core/AppSettingsContext'
import { ConfirmProvider } from './core/ConfirmModal'
import { NotificationProvider } from './core/notification/NotificationContext'
import I18nProvider from './core/i18n/I18nProvider'
import ErrorBoundary from './core/ErrorBoundary'
import { hasConsent } from './core/rgpd/consentManager'
import { applyAllPreferences } from './core/preference/applyPreferences'
import './core/i18n/i18n'
import './core/styles/global.scss'
import './core/styles/animations.scss'

// Apply theme + preferences before render to prevent flash
;(() => {
  const token = localStorage.getItem('access_token')
  if (token && hasConsent('functional')) {
    // Authenticated: apply user preferences synchronously
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const userId = payload.sub
      if (userId) {
        const raw = localStorage.getItem(`preferences_${userId}`)
        if (raw) {
          const prefs = JSON.parse(raw)
          if (prefs.theme) {
            document.documentElement.setAttribute('data-theme', prefs.theme)
          }
          if (prefs.backgroundTheme) {
            document.documentElement.setAttribute('data-bg-theme', String(prefs.backgroundTheme))
          }
          if (prefs.customColors) {
            const theme = prefs.theme === 'dark' ? 'dark' : 'light'
            const colors = prefs.customColors[theme]
            if (colors) {
              const el = document.documentElement.style
              for (const [k, v] of Object.entries(colors)) {
                if (v) el.setProperty(`--${k}`, v as string)
              }
            }
          }
          applyAllPreferences(prefs)
        }
      }
    } catch {
      // ignore
    }
  } else if (!token) {
    // Public page (login/register): random theme applied synchronously (no flash)
    const THEME_KEY = '_public_theme'
    const prev = sessionStorage.getItem(THEME_KEY) || 'light'
    const keepPrev = Math.random() < 0.75
    const next = keepPrev ? prev : (prev === 'dark' ? 'light' : 'dark')
    sessionStorage.setItem(THEME_KEY, next)
    document.documentElement.setAttribute('data-theme', next)
  }
})()

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Silent fail — push just won't work
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <AppSettingsProvider>
        <AuthProvider>
          <I18nProvider>
            <ErrorBoundary>
              <PermissionProvider>
                <FeatureProvider>
                  <ConfirmProvider>
                    <NotificationProvider>
                      <App />
                    </NotificationProvider>
                  </ConfirmProvider>
                </FeatureProvider>
              </PermissionProvider>
            </ErrorBoundary>
          </I18nProvider>
        </AuthProvider>
      </AppSettingsProvider>
    </BrowserRouter>,
)
