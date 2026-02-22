import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import i18next from 'i18next'
import api from '../api'
import type { User } from '../types'
import { hasConsent } from './rgpd/consentManager'
import { applyAllPreferences } from './preference/applyPreferences'

interface LoginResult {
  must_change_password: boolean
  mfa_required: boolean
  mfa_token: string | null
  mfa_methods: string[] | null
  mfa_setup_required: boolean
  mfa_grace_period_expires: string | null
  email_verification_required: boolean
  email_verification_email: string | null
  debug_code: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  loginWithSSO: (accessToken: string, refreshToken: string) => Promise<void>
  verifyMFA: (mfaToken: string, code: string, method: string) => Promise<{ must_change_password: boolean }>
  logout: () => void
  refreshUser: () => Promise<void>
  getPreference: (key: string, defaultValue?: any) => any
  updatePreference: (key: string, value: any) => Promise<void>
  isMfaSetupRequired: () => boolean
  getMfaGraceExpires: () => Date | null
  clearMfaSetupRequired: () => void
  isImpersonating: boolean
  impersonatedUser: { id: number; name: string } | null
  startImpersonation: (userId: number) => Promise<void>
  stopImpersonation: () => Promise<void>
  searchUsersForImpersonation: (query: string) => Promise<any[]>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonatedUser, setImpersonatedUser] = useState<{ id: number; name: string } | null>(null)

  const getLocalPreferences = (userId: number): Record<string, any> => {
    if (!hasConsent('functional')) return {}
    try {
      const raw = localStorage.getItem(`preferences_${userId}`)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  const setLocalPreferences = (userId: number, prefs: Record<string, any>) => {
    if (!hasConsent('functional')) return
    localStorage.setItem(`preferences_${userId}`, JSON.stringify(prefs))
  }

  const checkImpersonationStatus = async () => {
    try {
      const response = await api.get('/impersonation/status')
      const data = response.data
      if (data.is_impersonating) {
        setIsImpersonating(true)
        setImpersonatedUser({ id: data.target_user_id, name: data.target_user_name })
        localStorage.setItem('impersonation_active', 'true')
      } else {
        setIsImpersonating(false)
        setImpersonatedUser(null)
        localStorage.removeItem('impersonation_active')
      }
    } catch {
      setIsImpersonating(false)
      setImpersonatedUser(null)
    }
  }

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      const response = await api.get('/auth/me')
      const userData = response.data as User
      if (userData.preferences && userData.id) {
        const local = getLocalPreferences(userData.id)
        const merged = { ...userData.preferences, ...local }
        setLocalPreferences(userData.id, merged)
        userData.preferences = merged
        // Apply theme to DOM (handles SSO/login where pre-render didn't have token yet)
        if (merged.theme) {
          document.documentElement.setAttribute('data-theme', merged.theme)
        }
        if (merged.backgroundTheme !== undefined) {
          document.documentElement.setAttribute('data-bg-theme', String(merged.backgroundTheme))
        }
        // Apply custom colors
        if (merged.customColors) {
          const themeKey = (merged.theme || 'light') === 'dark' ? 'dark' : 'light'
          const colors = merged.customColors[themeKey]
          if (colors) {
            for (const [k, v] of Object.entries(colors)) {
              if (v) document.documentElement.style.setProperty(`--${k}`, v as string)
            }
          }
        }
        // Apply font, layout, composants, accessibilite preferences
        applyAllPreferences(merged)
      }
      setUser(userData)
      await checkImpersonationStatus()
    } catch {
      setUser(null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  // Poll for legal document updates every 2 minutes (mid-session detection)
  useEffect(() => {
    if (!user) return
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/rgpd/legal/acceptance/check')
        if (res.data.pending) await fetchUser()
      } catch { /* ignore */ }
    }, 120_000)
    return () => clearInterval(interval)
  }, [user?.id])

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const response = await api.post('/auth/login', { email, password })
    const { access_token, refresh_token, must_change_password, mfa_required, mfa_token, mfa_methods, mfa_setup_required, mfa_grace_period_expires, email_verification_required, email_verification_email, debug_code } = response.data

    if (email_verification_required) {
      return { must_change_password: false, mfa_required: false, mfa_token: null, mfa_methods: null, mfa_setup_required: false, mfa_grace_period_expires: null, email_verification_required: true, email_verification_email: email_verification_email || email, debug_code: debug_code || null }
    }

    if (mfa_required) {
      return { must_change_password: false, mfa_required: true, mfa_token, mfa_methods, mfa_setup_required: false, mfa_grace_period_expires: null, email_verification_required: false, email_verification_email: null, debug_code: null }
    }

    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)

    if (mfa_setup_required) {
      localStorage.setItem('mfa_setup_required', 'true')
      if (mfa_grace_period_expires) {
        localStorage.setItem('mfa_grace_period_expires', mfa_grace_period_expires)
      }
    }

    await fetchUser()
    return { must_change_password, mfa_required: false, mfa_token: null, mfa_methods: null, mfa_setup_required: mfa_setup_required || false, mfa_grace_period_expires: mfa_grace_period_expires || null, email_verification_required: false, email_verification_email: null, debug_code: null }
  }

  const loginWithSSO = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    await fetchUser()
  }

  const verifyMFA = async (mfaToken: string, code: string, method: string) => {
    const response = await api.post('/mfa/verify', { mfa_token: mfaToken, code, method })
    const { access_token, refresh_token, must_change_password } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    await fetchUser()
    return { must_change_password }
  }

  const isMfaSetupRequired = (): boolean => {
    return localStorage.getItem('mfa_setup_required') === 'true'
  }

  const getMfaGraceExpires = (): Date | null => {
    const raw = localStorage.getItem('mfa_grace_period_expires')
    return raw ? new Date(raw) : null
  }

  const clearMfaSetupRequired = () => {
    localStorage.removeItem('mfa_setup_required')
    localStorage.removeItem('mfa_grace_period_expires')
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('impersonation_active')
    localStorage.removeItem('mfa_setup_required')
    localStorage.removeItem('mfa_grace_period_expires')
    setUser(null)
    setIsImpersonating(false)
    setImpersonatedUser(null)
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  const getPreference = (key: string, defaultValue: any = null): any => {
    if (!user) return defaultValue
    const local = getLocalPreferences(user.id)
    if (key in local) return local[key]
    if (user.preferences && key in user.preferences) return user.preferences[key]
    return defaultValue
  }

  const updatePreference = async (key: string, value: any) => {
    if (!user) return
    const local = getLocalPreferences(user.id)
    local[key] = value
    setLocalPreferences(user.id, local)
    setUser(prev => prev ? { ...prev, preferences: { ...(prev.preferences || {}), [key]: value } } : null)
    try {
      await api.put('/auth/me/preferences', { [key]: value })
    } catch {
      // localStorage already updated
    }
  }

  const startImpersonation = async (userId: number) => {
    try {
      const response = await api.post(`/impersonation/start/${userId}`)
      const { access_token, refresh_token } = response.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('impersonation_active', 'true')
      await fetchUser()
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || i18next.t('common:impersonation_start_error'))
    }
  }

  const stopImpersonation = async () => {
    try {
      const response = await api.post('/impersonation/stop')
      const { access_token, refresh_token } = response.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.removeItem('impersonation_active')
      window.location.href = window.location.pathname
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || i18next.t('common:impersonation_stop_error'))
    }
  }

  const searchUsersForImpersonation = async (query: string) => {
    if (query.length < 2) return []
    try {
      const response = await api.get('/impersonation/search-users', { params: { q: query } })
      return response.data
    } catch {
      return []
    }
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, loginWithSSO, verifyMFA, logout, refreshUser,
      getPreference, updatePreference,
      isMfaSetupRequired, getMfaGraceExpires, clearMfaSetupRequired,
      isImpersonating, impersonatedUser,
      startImpersonation, stopImpersonation, searchUsersForImpersonation,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
