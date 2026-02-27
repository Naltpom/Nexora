import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import api, { getAccessToken } from '../api'
import { useAuth } from './AuthContext'

interface PermissionContextType {
  permissions: string[]
  loading: boolean
  can: (code: string) => boolean
  canAny: (...codes: string[]) => boolean
  canAll: (...codes: string[]) => boolean
  refreshPermissions: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchPermissions = useCallback(async () => {
    try {
      const token = getAccessToken()
      if (!token && !localStorage.getItem('has_session')) {
        setPermissions([])
        setLoading(false)
        return
      }
      const response = await api.get('/auth/me/permissions')
      setPermissions(response.data.permissions || [])
    } catch {
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [user?.id, fetchPermissions])

  const can = useCallback((code: string): boolean => permissions.includes(code), [permissions])
  const canAny = useCallback((...codes: string[]): boolean => codes.some(c => permissions.includes(c)), [permissions])
  const canAll = useCallback((...codes: string[]): boolean => codes.every(c => permissions.includes(c)), [permissions])

  const contextValue = useMemo(() => ({
    permissions, loading, can, canAny, canAll, refreshPermissions: fetchPermissions
  }), [permissions, loading, can, canAny, canAll, fetchPermissions])

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermission() {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider')
  }
  return context
}
