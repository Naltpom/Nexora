import { useState, useEffect, useCallback, useRef } from 'react'

interface MaintenanceStatus {
  is_active: boolean
  message: string | null
  scheduled_end: string | null
}

const POLL_INTERVAL = 30_000 // 30s fallback poll

/**
 * Hook for maintenance status — uses direct fetch() (not api client)
 * so it works before login (no auth required for /api/maintenance/status).
 * Also listens to SSE 'maintenance_mode' events for real-time updates.
 */
export function useMaintenanceStatus() {
  const [status, setStatus] = useState<MaintenanceStatus>({
    is_active: false,
    message: null,
    scheduled_end: null,
  })
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance/status')
      if (res.ok) {
        const data = await res.json()
        if (mountedRef.current) {
          setStatus(data)
        }
      }
    } catch {
      // Network error — keep previous state
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll every 30s as fallback
  useEffect(() => {
    const interval = setInterval(fetchStatus, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Listen for custom event dispatched by SSE or 503 interceptor
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) {
        setStatus({
          is_active: detail.is_active ?? false,
          message: detail.message ?? null,
          scheduled_end: detail.scheduled_end ?? null,
        })
      } else {
        // Refetch on generic event
        fetchStatus()
      }
    }
    window.addEventListener('maintenance_mode_change', handler)
    return () => window.removeEventListener('maintenance_mode_change', handler)
  }, [fetchStatus])

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  return { ...status, loading, refetch: fetchStatus }
}
