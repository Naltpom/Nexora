import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import api from '../api'
import type { FeatureManifest } from '../types'

interface FeatureContextType {
  features: Record<string, FeatureManifest>
  loading: boolean
  isActive: (name: string) => boolean
  refreshFeatures: () => Promise<void>
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined)

export function FeatureProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Record<string, FeatureManifest>>({})
  const [loading, setLoading] = useState(true)

  const fetchFeatures = useCallback(async () => {
    try {
      const response = await api.get('/features/manifest')
      const list: FeatureManifest[] = response.data
      const map: Record<string, FeatureManifest> = {}
      for (const f of list) {
        map[f.name] = f
      }
      setFeatures(map)
    } catch {
      // If not authenticated or endpoint not available, empty features
      setFeatures({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  const isActive = useCallback((name: string): boolean => {
    const feature = features[name]
    if (!feature) return false
    return feature.active
  }, [features])

  const contextValue = useMemo(() => ({
    features, loading, isActive, refreshFeatures: fetchFeatures
  }), [features, loading, isActive, fetchFeatures])

  return (
    <FeatureContext.Provider value={contextValue}>
      {children}
    </FeatureContext.Provider>
  )
}

export function useFeature() {
  const context = useContext(FeatureContext)
  if (context === undefined) {
    throw new Error('useFeature must be used within a FeatureProvider')
  }
  return context
}
