import { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react'
import i18next from 'i18next'
import api, { setAccessToken, getAccessToken, clearAccessToken } from '../api'
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
  loginWithSSO: (accessToken: string) => Promise<void>
  verifyMFA: (mfaToken: string, code: string, method: string) => Promise<{ must_change_password: boolean }>
  logout: () => Promise<void>
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

// ── Reducer ──

interface AuthState {
  user: User | null
  loading: boolean
  isImpersonating: boolean
  impersonatedUser: { id: number; name: string } | null
}

type AuthAction =
  | { type: 'FETCH_USER_SUCCESS'; user: User; isImpersonating: boolean; impersonatedUser: { id: number; name: string } | null }
  | { type: 'FETCH_USER_FAILURE' }
  | { type: 'UPDATE_PREFERENCE'; key: string; value: any }
  | { type: 'LOGOUT' }

const initialState: AuthState = {
  user: null,
  loading: true,
  isImpersonating: false,
  impersonatedUser: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'FETCH_USER_SUCCESS':
      return {
        user: action.user,
        loading: false,
        isImpersonating: action.isImpersonating,
        impersonatedUser: action.impersonatedUser,
      }
    case 'FETCH_USER_FAILURE':
      return { ...initialState, loading: false }
    case 'UPDATE_PREFERENCE':
      if (!state.user) return state
      return {
        ...state,
        user: {
          ...state.user,
          preferences: { ...(state.user.preferences || {}), [action.key]: action.value },
        },
      }
    case 'LOGOUT':
      return { ...initialState, loading: false }
    default:
      return state
  }
}

// ── Helpers (pure functions, no hooks) ──

function getLocalPreferences(userId: number): Record<string, any> {
  if (!hasConsent('functional')) return {}
  try {
    const raw = localStorage.getItem(`preferences_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLocalPreferences(userId: number, prefs: Record<string, any>) {
  if (!hasConsent('functional')) return
  localStorage.setItem(`preferences_${userId}`, JSON.stringify(prefs))
}

function applyUserPreferences(userData: User) {
  if (!userData.preferences || !userData.id) return

  const local = getLocalPreferences(userData.id)
  const merged = { ...userData.preferences, ...local }
  setLocalPreferences(userData.id, merged)
  userData.preferences = merged

  if (merged.theme) {
    document.documentElement.setAttribute('data-theme', merged.theme)
  }
  if (merged.backgroundTheme !== undefined) {
    document.documentElement.setAttribute('data-bg-theme', String(merged.backgroundTheme))
  }
  if (merged.customColors) {
    const themeKey = (merged.theme || 'light') === 'dark' ? 'dark' : 'light'
    const colors = merged.customColors[themeKey]
    if (colors) {
      for (const [k, v] of Object.entries(colors)) {
        if (v) document.documentElement.style.setProperty(`--${k}`, v as string)
      }
    }
  }
  applyAllPreferences(merged)
  if (hasConsent('functional')) {
    if (merged.theme) localStorage.setItem('last_theme', merged.theme)
    if (merged.backgroundTheme !== undefined) localStorage.setItem('last_bg_theme', String(merged.backgroundTheme))
  }
}

function syncMfaStatus(userData: User) {
  if (userData.mfa_setup_required) {
    localStorage.setItem('mfa_setup_required', 'true')
    if (userData.mfa_grace_period_expires) {
      localStorage.setItem('mfa_grace_period_expires', userData.mfa_grace_period_expires)
    }
  } else {
    localStorage.removeItem('mfa_setup_required')
    localStorage.removeItem('mfa_grace_period_expires')
  }
}

// ── Provider ──

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const { user, loading, isImpersonating, impersonatedUser } = state

  // Ref to access latest user in stable callbacks without adding user as a dep
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  const fetchUser = useCallback(async () => {
    try {
      const token = getAccessToken()
      if (!token && !localStorage.getItem('has_session')) {
        dispatch({ type: 'FETCH_USER_FAILURE' })
        return
      }
      const response = await api.get('/auth/me')
      const userData = response.data as User
      applyUserPreferences(userData)
      syncMfaStatus(userData)

      // Check impersonation status
      let impersonating = false
      let impersonatedUsr: { id: number; name: string } | null = null
      try {
        const impRes = await api.get('/impersonation/status')
        if (impRes.data.is_impersonating) {
          impersonating = true
          impersonatedUsr = { id: impRes.data.target_user_id, name: impRes.data.target_user_name }
          localStorage.setItem('impersonation_active', 'true')
        } else {
          localStorage.removeItem('impersonation_active')
        }
      } catch {
        localStorage.removeItem('impersonation_active')
      }

      dispatch({ type: 'FETCH_USER_SUCCESS', user: userData, isImpersonating: impersonating, impersonatedUser: impersonatedUsr })
    } catch {
      clearAccessToken()
      dispatch({ type: 'FETCH_USER_FAILURE' })
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

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
  }, [user?.id, fetchUser])

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const response = await api.post('/auth/login', { email, password })
    const { access_token, must_change_password, mfa_required, mfa_token, mfa_methods, mfa_setup_required, mfa_grace_period_expires, email_verification_required, email_verification_email, debug_code } = response.data

    if (email_verification_required) {
      return { must_change_password: false, mfa_required: false, mfa_token: null, mfa_methods: null, mfa_setup_required: false, mfa_grace_period_expires: null, email_verification_required: true, email_verification_email: email_verification_email || email, debug_code: debug_code || null }
    }

    if (mfa_required) {
      return { must_change_password: false, mfa_required: true, mfa_token, mfa_methods, mfa_setup_required: false, mfa_grace_period_expires: null, email_verification_required: false, email_verification_email: null, debug_code: null }
    }

    setAccessToken(access_token)

    if (mfa_setup_required) {
      localStorage.setItem('mfa_setup_required', 'true')
      if (mfa_grace_period_expires) {
        localStorage.setItem('mfa_grace_period_expires', mfa_grace_period_expires)
      }
    }

    await fetchUser()
    return { must_change_password, mfa_required: false, mfa_token: null, mfa_methods: null, mfa_setup_required: mfa_setup_required || false, mfa_grace_period_expires: mfa_grace_period_expires || null, email_verification_required: false, email_verification_email: null, debug_code: null }
  }, [fetchUser])

  const loginWithSSO = useCallback(async (token: string) => {
    setAccessToken(token)
    await fetchUser()
  }, [fetchUser])

  const verifyMFA = useCallback(async (mfaToken: string, code: string, method: string) => {
    const response = await api.post('/mfa/verify', { mfa_token: mfaToken, code, method })
    const { access_token, must_change_password } = response.data
    setAccessToken(access_token)
    await fetchUser()
    return { must_change_password }
  }, [fetchUser])

  const isMfaSetupRequired = useCallback((): boolean => {
    return localStorage.getItem('mfa_setup_required') === 'true'
  }, [])

  const getMfaGraceExpires = useCallback((): Date | null => {
    const raw = localStorage.getItem('mfa_grace_period_expires')
    return raw ? new Date(raw) : null
  }, [])

  const clearMfaSetupRequired = useCallback(() => {
    localStorage.removeItem('mfa_setup_required')
    localStorage.removeItem('mfa_grace_period_expires')
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best-effort: cookie cleared server-side
    }
    clearAccessToken()
    localStorage.removeItem('impersonation_active')
    localStorage.removeItem('mfa_setup_required')
    localStorage.removeItem('mfa_grace_period_expires')
    dispatch({ type: 'LOGOUT' })
  }, [])

  const refreshUser = useCallback(async () => {
    await fetchUser()
  }, [fetchUser])

  const getPreference = useCallback((key: string, defaultValue: any = null): any => {
    const u = userRef.current
    if (!u) return defaultValue
    const local = getLocalPreferences(u.id)
    if (key in local) return local[key]
    if (u.preferences && key in u.preferences) return u.preferences[key]
    return defaultValue
  }, [])

  const updatePreference = useCallback(async (key: string, value: any) => {
    const u = userRef.current
    if (!u) return
    const local = getLocalPreferences(u.id)
    local[key] = value
    setLocalPreferences(u.id, local)
    dispatch({ type: 'UPDATE_PREFERENCE', key, value })
    try {
      await api.put('/auth/me/preferences', { [key]: value })
    } catch {
      // localStorage already updated
    }
  }, [])

  const startImpersonation = useCallback(async (userId: number) => {
    try {
      const response = await api.post(`/impersonation/start/${userId}`)
      const { access_token } = response.data
      setAccessToken(access_token)
      localStorage.setItem('impersonation_active', 'true')
      window.location.href = '/'
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || i18next.t('common:impersonation_start_error'))
    }
  }, [])

  const stopImpersonation = useCallback(async () => {
    try {
      const response = await api.post('/impersonation/stop')
      const { access_token } = response.data
      setAccessToken(access_token)
      localStorage.removeItem('impersonation_active')
      window.location.href = window.location.pathname
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || i18next.t('common:impersonation_stop_error'))
    }
  }, [])

  const searchUsersForImpersonation = useCallback(async (query: string) => {
    if (query.length < 2) return []
    try {
      const response = await api.get('/impersonation/search-users', { params: { q: query } })
      return response.data
    } catch {
      return []
    }
  }, [])

  const contextValue = useMemo(() => ({
    user, loading, login, loginWithSSO, verifyMFA, logout, refreshUser,
    getPreference, updatePreference,
    isMfaSetupRequired, getMfaGraceExpires, clearMfaSetupRequired,
    isImpersonating, impersonatedUser,
    startImpersonation, stopImpersonation, searchUsersForImpersonation,
  }), [
    user, loading, login, loginWithSSO, verifyMFA, logout, refreshUser,
    getPreference, updatePreference,
    isMfaSetupRequired, getMfaGraceExpires, clearMfaSetupRequired,
    isImpersonating, impersonatedUser,
    startImpersonation, stopImpersonation, searchUsersForImpersonation,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
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
