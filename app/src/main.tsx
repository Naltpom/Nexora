import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import { AuthProvider } from './core/AuthContext'
import { PermissionProvider } from './core/PermissionContext'
import { FeatureProvider } from './core/FeatureContext'
import { AppSettingsProvider } from './core/AppSettingsContext'
import { ConfirmProvider } from './core/ConfirmModal'
import { NotificationProvider } from './core/notification/NotificationContext'
import { RealtimeProvider } from './core/realtime/RealtimeProvider'
import { RealtimeSyncBridge } from './core/realtime/RealtimeSyncBridge'
import I18nProvider from './core/i18n/I18nProvider'
import ErrorBoundary from './core/ErrorBoundary'
import { hasConsent } from './core/rgpd/consentManager'
import './core/i18n/i18n'
import './core/styles/global.scss'
import './core/styles/animations.scss'

// Apply theme + preferences before render to prevent flash
;(() => {
  if (hasConsent('functional')) {
    const theme = localStorage.getItem('last_theme')
    const bgTheme = localStorage.getItem('last_bg_theme')
    if (theme) document.documentElement.setAttribute('data-theme', theme)
    if (bgTheme) document.documentElement.setAttribute('data-bg-theme', bgTheme)
    if (!theme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    }
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  }
})()

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Silent fail — push just won't work
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
      <AppSettingsProvider>
        <AuthProvider>
          <I18nProvider>
            <ErrorBoundary>
              <PermissionProvider>
                <FeatureProvider>
                  <RealtimeProvider>
                    <RealtimeSyncBridge />
                    <ConfirmProvider>
                      <NotificationProvider>
                        <App />
                      </NotificationProvider>
                    </ConfirmProvider>
                  </RealtimeProvider>
                </FeatureProvider>
              </PermissionProvider>
            </ErrorBoundary>
          </I18nProvider>
        </AuthProvider>
      </AppSettingsProvider>
    </BrowserRouter>,
)
