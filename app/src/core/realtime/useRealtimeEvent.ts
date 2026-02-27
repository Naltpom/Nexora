import { useEffect } from 'react'
import { useRealtime } from './RealtimeProvider'

/**
 * Subscribe to a specific realtime event type.
 *
 * Usage:
 *   useRealtimeEvent('notification', (data) => { ... })
 *   useRealtimeEvent('feature_toggle', (data) => { ... })
 *   useRealtimeEvent('permission_change', () => refreshPermissions())
 */
export function useRealtimeEvent(eventType: string, handler: (data: unknown) => void): void {
  const { subscribe } = useRealtime()

  useEffect(() => {
    const unsubscribe = subscribe(eventType, handler)
    return unsubscribe
  }, [eventType, handler, subscribe])
}
