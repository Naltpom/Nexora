import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import api from '../api'

interface PublicAppSettings {
  app_name: string
  app_description: string
  app_logo: string
  app_favicon: string
  primary_color: string
  header_show_logo: string
  header_show_name: string
}

const DEFAULTS: PublicAppSettings = {
  app_name: 'Nexora',
  app_description: '',
  app_logo: '/logo_full.svg',
  app_favicon: '/favicon.svg',
  primary_color: '#1E40AF',
  header_show_logo: 'true',
  header_show_name: 'true',
}

interface AppSettingsContextType {
  settings: PublicAppSettings
  loading: boolean
  refreshSettings: () => Promise<void>
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined)

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicAppSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings/public')
      setSettings({ ...DEFAULTS, ...res.data })
    } catch {
      setSettings(DEFAULTS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return (
    <AppSettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider')
  }
  return context
}
