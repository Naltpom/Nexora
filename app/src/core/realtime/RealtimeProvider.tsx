import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { useAuth } from '../AuthContext'
import { useFeature } from '../FeatureContext'
import { getAccessToken } from '../../api'

type RealtimeEventHandler = (data: unknown) => void

interface RealtimeContextType {
  connected: boolean
  subscribe: (eventType: string, handler: RealtimeEventHandler) => () => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

const RECONNECT_BASE_MS = 5_000
const RECONNECT_MAX_MS = 60_000

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { isActive } = useFeature()
  const realtimeActive = isActive('realtime')
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const handlersRef = useRef<Map<string, Set<RealtimeEventHandler>>>(new Map())
  const registeredEventsRef = useRef<Set<string>>(new Set())

  const dispatch = useCallback((eventType: string, data: unknown) => {
    const handlers = handlersRef.current.get(eventType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (err) {
          console.error(`Realtime handler error for "${eventType}":`, err)
        }
      })
    }
    // Wildcard subscribers
    const wildcardHandlers = handlersRef.current.get('*')
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler({ eventType, data })
        } catch (err) {
          console.error('Realtime wildcard handler error:', err)
        }
      })
    }
  }, [])

  const registerEventType = useCallback((eventType: string) => {
    const es = eventSourceRef.current
    if (!es || eventType === '*' || eventType === 'heartbeat') return
    if (registeredEventsRef.current.has(eventType)) return

    registeredEventsRef.current.add(eventType)
    es.addEventListener(eventType, (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        dispatch(eventType, data)
      } catch {
        // ignore malformed events
      }
    })
  }, [dispatch])

  const connectSSE = useCallback(() => {
    const token = getAccessToken()
    if (!token) return

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    registeredEventsRef.current.clear()

    const es = new EventSource(`/api/realtime/stream?token=${token}`)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnected(true)
      reconnectAttemptRef.current = 0
    }

    es.addEventListener('heartbeat', () => {
      // keep-alive, noop
    })

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      setConnected(false)
      registeredEventsRef.current.clear()

      // Exponential backoff: 5s, 10s, 20s, 40s, 60s max
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, reconnectAttemptRef.current),
        RECONNECT_MAX_MS,
      )
      reconnectAttemptRef.current++
      reconnectTimeoutRef.current = setTimeout(() => connectSSE(), delay)
    }

    // Re-register all known event types after (re)connect
    for (const eventType of handlersRef.current.keys()) {
      registerEventType(eventType)
    }
  }, [registerEventType])

  const subscribe = useCallback((eventType: string, handler: RealtimeEventHandler): (() => void) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set())
    }
    handlersRef.current.get(eventType)!.add(handler)

    // Register on the EventSource if connected
    registerEventType(eventType)

    return () => {
      const handlers = handlersRef.current.get(eventType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          handlersRef.current.delete(eventType)
        }
      }
    }
  }, [registerEventType])

  useEffect(() => {
    if (user && realtimeActive) {
      connectSSE()
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setConnected(false)
      registeredEventsRef.current.clear()
      reconnectAttemptRef.current = 0
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      registeredEventsRef.current.clear()
    }
  }, [user, realtimeActive, connectSSE])

  const contextValue = useMemo(() => ({ connected, subscribe }), [connected, subscribe])

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}
