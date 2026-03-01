import { useState, useEffect, useCallback } from 'react'
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
  const [queue, setQueue] = useState<ModalAnnouncement[]>([])

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
    fetchMandatory()
  }, [fetchMandatory])

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

  if (queue.length === 0) return null

  return (
    <AnnouncementModal
      announcement={queue[0]}
      blocking
      onDismissed={handleDismissed}
      onClose={() => {}}
    />
  )
}
