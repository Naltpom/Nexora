import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './core/AuthContext'
import { PermissionProvider } from './core/PermissionContext'
import { FeatureProvider } from './core/FeatureContext'
import { ConfirmProvider } from './core/ConfirmModal'
import { NotificationProvider } from './features/notification/NotificationContext'
import './core/styles/global.css'

// Apply theme before render to prevent white flash
;(() => {
  const token = localStorage.getItem('access_token')
  if (token) {
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
        }
      }
    } catch {
      // ignore
    }
  }
})()

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Silent fail — push just won't work
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PermissionProvider>
          <FeatureProvider>
            <ConfirmProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </ConfirmProvider>
          </FeatureProvider>
        </PermissionProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
