import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../AuthContext'
import { useFeature } from '../FeatureContext'
import { useRealtimeEvent } from '../realtime/useRealtimeEvent'
import api from '../../api'
import AnnouncementModal from './AnnouncementModal'

interface ModalAnnouncement {
  id: number
  title: string
  body: string | null
  type: string
  requires_acknowledgment: boolean
  priority: number
  start_date: string
  end_date: string | null
  created_at: string
  is_read: boolean
}

export default function AnnouncementBlocker() {
  const { user, isImpersonating } = useAuth()
  const { isActive } = useFeature()
  const [queue, setQueue] = useState<ModalAnnouncement[]>([])
  const onboardingDone = (user?.preferences as Record<string, unknown>)?.onboarding_completed === true
  const isBlocking = !isActive('onboarding') || onboardingDone

  const fetchMandatory = useCallback(async () => {
    try {
      const res = await api.get('/announcements/modal/active')
      const mandatory = (res.data as ModalAnnouncement[]).filter(a => a.requires_acknowledgment)
      setQueue(mandatory)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (isBlocking) {
      fetchMandatory()
    }
  }, [isBlocking, fetchMandatory])

  const handleSSE = useCallback((data: unknown) => {
    const evt = data as { action?: string; requires_acknowledgment?: boolean }
    if (evt.action === 'created' && evt.requires_acknowledgment) {
      fetchMandatory()
    }
  }, [fetchMandatory])

  useRealtimeEvent('announcement', handleSSE)

  const handleDismissed = useCallback((id: number) => {
    setQueue(prev => prev.filter(a => a.id !== id))
  }, [])

  const hasItems = queue.length > 0

  useEffect(() => {
    document.documentElement.toggleAttribute('data-modal-blocking', isBlocking && hasItems)
    return () => document.documentElement.removeAttribute('data-modal-blocking')
  }, [isBlocking, hasItems])

  if (isImpersonating) return null
  if (!isBlocking) return null
  if (!hasItems) return null

  return (
    <AnnouncementModal
      announcement={queue[0]}
      blocking
      onDismissed={handleDismissed}
      onClose={() => {}}
    />
  )
}
