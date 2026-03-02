import { type ReactNode, useCallback } from 'react'
import { useMaintenanceStatus } from './useMaintenanceStatus'
import { useRealtimeEvent } from '../realtime/useRealtimeEvent'
import MaintenancePage from './MaintenancePage'

interface Props {
  children: ReactNode
  canBypass: boolean
}

export default function MaintenanceGuard({ children, canBypass }: Props) {
  const { is_active, message, scheduled_end, loading } = useMaintenanceStatus()

  // Listen for SSE maintenance_mode events
  const handleSSE = useCallback((data: unknown) => {
    const evt = data as { is_active?: boolean; message?: string; scheduled_end?: string }
    window.dispatchEvent(new CustomEvent('maintenance_mode_change', { detail: evt }))
  }, [])

  useRealtimeEvent('maintenance_mode', handleSSE)

  if (loading) return <>{children}</>

  if (is_active && !canBypass) {
    return <MaintenancePage message={message} scheduledEnd={scheduled_end} />
  }

  return <>{children}</>
}
