import { useCallback } from 'react'
import { useFeature } from '../FeatureContext'
import { usePermission } from '../PermissionContext'
import { useRealtimeEvent } from './useRealtimeEvent'

/**
 * Bridge component that syncs realtime events with contexts
 * that are higher in the component tree (FeatureContext, PermissionContext).
 *
 * Must be rendered inside RealtimeProvider.
 */
export function RealtimeSyncBridge() {
  const { refreshFeatures } = useFeature()
  const { refreshPermissions } = usePermission()

  const handleFeatureToggle = useCallback(() => {
    refreshFeatures()
  }, [refreshFeatures])

  const handlePermissionChange = useCallback(() => {
    refreshPermissions()
  }, [refreshPermissions])

  useRealtimeEvent('feature_toggle', handleFeatureToggle)
  useRealtimeEvent('permission_change', handlePermissionChange)

  return null
}
