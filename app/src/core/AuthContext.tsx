import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ must_change_password: boolean }>
  logout: () => void
  refreshUser: () => Promise<void>
  getPreference: (key: string, defaultValue?: any) => any
  updatePreference: (key: string, value: any) => Promise<void>
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
    try {
      const raw = localStorage.getItem(`preferences_${userId}`)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  const setLocalPreferences = (userId: number, prefs: Record<string, any>) => {
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

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    const { access_token, refresh_token, must_change_password } = response.data
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    await fetchUser()
    return { must_change_password }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('impersonation_active')
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
      throw new Error(error.response?.data?.detail || "Erreur lors de l'impersonation")
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
      throw new Error(error.response?.data?.detail || "Erreur lors de la sortie d'impersonation")
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
      user, loading, login, logout, refreshUser,
      getPreference, updatePreference,
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
