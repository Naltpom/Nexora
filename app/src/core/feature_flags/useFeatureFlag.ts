import { useState, useEffect } from 'react'
import api from '../../api'

interface FlagResult {
  enabled: boolean
  variant: string | null
  loading: boolean
}

const cache: Record<string, { enabled: boolean; variant: string | null }> = {}

export function useFeatureFlag(featureName: string): FlagResult {
  const [result, setResult] = useState<FlagResult>(() => {
    const cached = cache[featureName]
    if (cached) {
      return { enabled: cached.enabled, variant: cached.variant, loading: false }
    }
    return { enabled: true, variant: null, loading: true }
  })

  useEffect(() => {
    if (cache[featureName]) return

    let cancelled = false
    api.get(`/feature-flags/evaluate/me/${featureName}`)
      .then(res => {
        if (cancelled) return
        const data = res.data
        cache[featureName] = { enabled: data.enabled, variant: data.variant }
        setResult({ enabled: data.enabled, variant: data.variant, loading: false })
      })
      .catch(() => {
        if (cancelled) return
        setResult({ enabled: true, variant: null, loading: false })
      })

    return () => { cancelled = true }
  }, [featureName])

  return result
}
