import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api'
import './announcement.scss'

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

interface Props {
  announcement: ModalAnnouncement
  blocking?: boolean
  onDismissed: (id: number) => void
  onClose: () => void
}

export default function AnnouncementModal({ announcement, blocking, onDismissed, onClose }: Props) {
  const { t } = useTranslation('announcement')
  const prevOverflow = useRef('')

  useEffect(() => {
    prevOverflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow.current
    }
  }, [])

  const notifyDismiss = useCallback(() => {
    window.dispatchEvent(new CustomEvent('announcement-dismissed'))
  }, [])

  const handleAcknowledge = useCallback(async () => {
    try {
      await api.post(`/announcements/${announcement.id}/dismiss`)
      onDismissed(announcement.id)
      notifyDismiss()
    } catch {
      // ignore
    }
  }, [announcement.id, onDismissed, notifyDismiss])

  const handleClose = useCallback(() => {
    if (!announcement.is_read) {
      api.post(`/announcements/${announcement.id}/dismiss`).catch(() => {})
      onDismissed(announcement.id)
      notifyDismiss()
    }
    onClose()
  }, [announcement, onDismissed, onClose])

  const typeBadgeClass = `announcement-type-badge ${announcement.type}`

  return createPortal(
    <div
      className={`modal-overlay${blocking ? ' announcement-blocker-overlay' : ''}`}
      onClick={blocking ? undefined : handleClose}
    >
      <div className="modal announcement-reader-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header announcement-reader-header">
          <div className="announcement-reader-header-left">
            <h3 className="announcement-reader-modal-title">{announcement.title}</h3>
            <div className="announcement-reader-header-info">
              <span className={typeBadgeClass}>{t(`type_${announcement.type}`)}</span>
              <span className="announcement-reader-date">
                {new Date(announcement.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          </div>
          {!blocking && (
            <button className="modal-close" onClick={handleClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="modal-body announcement-reader-body">
          {announcement.body && (
            announcement.body.startsWith('<')
              ? <div className="announcement-reader-content" dangerouslySetInnerHTML={{ __html: announcement.body }} />
              : <p className="announcement-reader-content">{announcement.body}</p>
          )}
        </div>
        <div className="modal-footer">
          {blocking ? (
            <button className="btn btn-primary" onClick={handleAcknowledge}>
              {t('modal_acknowledge_btn')}
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={handleClose}>
              {t('modal_close_btn')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
