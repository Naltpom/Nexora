import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import api from '../../api'
import { useAuth } from '../../core/AuthContext'
import { useFeature } from '../../core/FeatureContext'
import './notifications.scss'

// ── Inline push notification helpers ──

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await api.get('/notifications/push/vapid-key')
    return res.data.vapid_public_key
  } catch {
    return null
  }
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch (err) {
    console.error('SW registration failed:', err)
    return null
  }
}

async function subscribeToPush(): Promise<boolean> {
  try {
    const vapidKey = await getVapidPublicKey()
    if (!vapidKey) return false
    const registration = await registerServiceWorker()
    if (!registration) return false
    await navigator.serviceWorker.ready
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
    const subJson = subscription.toJSON()
    const ua = navigator.userAgent
    let browser = 'Navigateur'
    if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Edg')) browser = 'Edge'
    else if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Safari')) browser = 'Safari'
    await api.post('/notifications/push/subscribe', {
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh || '',
      auth: subJson.keys?.auth || '',
      browser,
    })
    return true
  } catch (err) {
    console.error('Push subscribe failed:', err)
    return false
  }
}

async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return true
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true
    await subscription.unsubscribe()
    await api.delete('/notifications/push/unsubscribe', { params: { endpoint: subscription.endpoint } })
    return true
  } catch (err) {
    console.error('Push unsubscribe failed:', err)
    return false
  }
}

async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return null
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}

// ── Types ──

interface Notification {
  id: number
  event_type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: (page?: number) => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>
  hasMore: boolean
  currentPage: number
  pushSupported: boolean
  pushPermission: NotificationPermission | 'unsupported'
  pushSubscribed: boolean
  subscribePush: () => Promise<boolean>
  unsubscribePush: () => Promise<boolean>
  refreshPushStatus: () => Promise<void>
}

const PUSH_PROMPT_DISMISSED_KEY = 'push_prompt_dismissed'

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { isActive } = useFeature()
  const pushFeatureActive = isActive('notification.push')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Push notification state
  const [pushSupported] = useState(isPushSupported())
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(getPushPermission())
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.count)
    } catch {
      // silently ignore
    }
  }, [])

  const fetchNotifications = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const res = await api.get('/notifications/', { params: { page, per_page: 20 } })
      const data = res.data
      if (page === 1) {
        setNotifications(data.items)
      } else {
        setNotifications(prev => [...prev, ...data.items])
      }
      setCurrentPage(page)
      setHasMore(page < Math.ceil(data.total / data.per_page))
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // silently ignore
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // silently ignore
    }
  }, [])

  const deleteNotification = useCallback(async (id: number) => {
    try {
      const notif = notifications.find(n => n.id === id)
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notif && !notif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch {
      // silently ignore
    }
  }, [notifications])

  // Push notification methods
  const refreshPushStatus = useCallback(async () => {
    setPushPermission(getPushPermission())
    const sub = await getCurrentSubscription()
    setPushSubscribed(!!sub)
  }, [])

  const handleSubscribePush = useCallback(async () => {
    const success = await subscribeToPush()
    if (success) {
      setPushSubscribed(true)
      setPushPermission('granted')
    }
    return success
  }, [])

  const handleUnsubscribePush = useCallback(async () => {
    const success = await unsubscribeFromPush()
    if (success) {
      setPushSubscribed(false)
    }
    return success
  }, [])

  const connectSSE = useCallback(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const es = new EventSource(`/api/notifications/stream?token=${token}`)
    eventSourceRef.current = es

    es.addEventListener('notification', (event) => {
      try {
        const data = JSON.parse(event.data)
        setNotifications(prev => [data, ...prev])
        setUnreadCount(prev => prev + 1)
      } catch {
        // ignore malformed events
      }
    })

    es.addEventListener('ping', () => {
      // keep-alive, do nothing
    })

    es.onerror = () => {
      es.close()
      eventSourceRef.current = null
      // Reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSSE()
      }, 5000)
    }
  }, [])

  // Initialize when user logs in
  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      fetchNotifications(1)
      connectSSE()
      refreshPushStatus()
    } else {
      setNotifications([])
      setUnreadCount(0)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [user, fetchUnreadCount, fetchNotifications, connectSSE, refreshPushStatus])

  // Show push prompt after login if not subscribed and not dismissed
  useEffect(() => {
    if (!user || !pushSupported || !pushFeatureActive) {
      setShowPushPrompt(false)
      return
    }
    const permission = getPushPermission()
    if (permission === 'denied') {
      setShowPushPrompt(false)
      return
    }
    // Check if user already subscribed
    getCurrentSubscription().then(sub => {
      if (sub) {
        setShowPushPrompt(false)
        return
      }
      // Check if user dismissed the prompt recently (24h)
      const dismissed = localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10)
        if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) {
          setShowPushPrompt(false)
          return
        }
      }
      // Show prompt after 2s delay so the page has time to load
      const timer = setTimeout(() => setShowPushPrompt(true), 2000)
      return () => clearTimeout(timer)
    })
  }, [user, pushSupported, pushSubscribed, pushFeatureActive])

  // Listen for push notification clicks (from service worker)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        window.location.href = event.data.url
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  const handlePromptAccept = async () => {
    const success = await handleSubscribePush()
    if (success) {
      setShowPushPrompt(false)
    } else {
      // Permission was denied by browser
      setShowPushPrompt(false)
    }
  }

  const handlePromptDismiss = () => {
    setShowPushPrompt(false)
    localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, String(Date.now()))
  }

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      hasMore,
      currentPage,
      pushSupported,
      pushPermission,
      pushSubscribed,
      subscribePush: handleSubscribePush,
      unsubscribePush: handleUnsubscribePush,
      refreshPushStatus,
    }}>
      {children}
      {showPushPrompt && (
        <div className="push-prompt-overlay">
          <div className="push-prompt">
            <div className="push-prompt-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="push-prompt-content">
              <div className="push-prompt-title">Activer les notifications</div>
              <div className="push-prompt-desc">
                Recevez les alertes directement dans votre navigateur, meme quand l'onglet est ferme.
              </div>
            </div>
            <div className="push-prompt-actions">
              <button className="push-prompt-btn push-prompt-btn-primary" onClick={handlePromptAccept}>
                Activer
              </button>
              <button className="push-prompt-btn push-prompt-btn-secondary" onClick={handlePromptDismiss}>
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
