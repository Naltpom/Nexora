import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import api from '../api'
import { useAuth } from './AuthContext'

export interface PermissionGrant {
  is_global: boolean
  scopes: Record<string, number[]>
}

interface PermissionContextType {
  grants: Record<string, PermissionGrant>
  permissions: string[]  // backward compat: list of permission codes
  loading: boolean
  can: (code: string) => boolean
  canAny: (...codes: string[]) => boolean
  canAll: (...codes: string[]) => boolean
  canGlobal: (code: string) => boolean
  getGrant: (code: string) => PermissionGrant | undefined
  refreshPermissions: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [grants, setGrants] = useState<Record<string, PermissionGrant>>({})
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await api.get('/auth/me/permissions')
      setGrants(response.data.permissions || {})
    } catch {
      setGrants({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setGrants({})
      setLoading(false)
      return
    }
    fetchPermissions()
  }, [user?.id, fetchPermissions])

  const permissions = useMemo(() => Object.keys(grants), [grants])
  const can = useCallback((code: string) => code in grants, [grants])
  const canAny = useCallback((...codes: string[]) => codes.some(c => c in grants), [grants])
  const canAll = useCallback((...codes: string[]) => codes.every(c => c in grants), [grants])
  const canGlobal = useCallback((code: string) => grants[code]?.is_global === true, [grants])
  const getGrant = useCallback((code: string): PermissionGrant | undefined => grants[code], [grants])

  const contextValue = useMemo(() => ({
    grants, permissions, loading, can, canAny, canAll, canGlobal, getGrant, refreshPermissions: fetchPermissions
  }), [grants, permissions, loading, can, canAny, canAll, canGlobal, getGrant, fetchPermissions])

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
