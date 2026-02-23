import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../api'
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

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
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
  }

  useEffect(() => {
    fetchPermissions()
  }, [user?.id])

  const can = (code: string): boolean => permissions.includes(code)
  const canAny = (...codes: string[]): boolean => codes.some(c => permissions.includes(c))
  const canAll = (...codes: string[]): boolean => codes.every(c => permissions.includes(c))

  return (
    <PermissionContext.Provider value={{ permissions, loading, can, canAny, canAll, refreshPermissions: fetchPermissions }}>
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
