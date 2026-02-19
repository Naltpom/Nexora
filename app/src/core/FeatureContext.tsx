import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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

  const fetchFeatures = async () => {
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
  }

  useEffect(() => {
    fetchFeatures()
  }, [])

  const isActive = (name: string): boolean => {
    const feature = features[name]
    if (!feature) return false
    return feature.active
  }

  return (
    <FeatureContext.Provider value={{ features, loading, isActive, refreshFeatures: fetchFeatures }}>
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
