import { useMemo } from 'react'
import { useFeature } from '../FeatureContext'
import { usePermission } from '../PermissionContext'
import type { AvailableExport, ExportDescriptor } from './types'

const featureModules: Record<string, any> = {
  ...import.meta.glob('../*/index.ts', { eager: true }),
  ...import.meta.glob('../../features/*/index.ts', { eager: true }),
}

export function useAvailableExports() {
  const { isActive } = useFeature()
  const { can } = usePermission()

  return useMemo(() => {
    const all: AvailableExport[] = []

    for (const [, mod] of Object.entries(featureModules)) {
      const manifest = (mod as any).manifest
      if (!manifest || !isActive(manifest.name)) continue

      const featureExports: ExportDescriptor[] = manifest.exports || []
      for (const exp of featureExports) {
        if (!can(exp.permission)) continue
        all.push({
          ...exp,
          featureName: manifest.name,
          featureLabel: manifest.exportLabel || manifest.name,
        })
      }
    }

    // Group by feature
    const grouped: Record<string, AvailableExport[]> = {}
    for (const exp of all) {
      if (!grouped[exp.featureName]) grouped[exp.featureName] = []
      grouped[exp.featureName].push(exp)
    }

    const hasOcScoped = all.some(e => e.scopeType === 'oc')

    return { exports: all, grouped, hasOcScoped }
  }, [isActive, can])
}
