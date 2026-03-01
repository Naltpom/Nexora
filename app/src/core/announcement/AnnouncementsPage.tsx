import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../Layout'
import { Pagination } from '../pagination'
import { useRealtimeEvent } from '../realtime/useRealtimeEvent'
import api from '../../api'
import AnnouncementModal from './AnnouncementModal'
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

export default function AnnouncementsPage() {
  const { t } = useTranslation('announcement')

  const [items, setItems] = useState<ModalAnnouncement[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedAnn, setSelectedAnn] = useState<ModalAnnouncement | null>(null)

  const loadData = useCallback(async (p?: number, pp?: number) => {
    try {
      const res = await api.get('/announcements/modal/', {
        params: { page: p ?? page, per_page: pp ?? perPage },
      })
      setItems(res.data.items)
      setTotalPages(res.data.pages)
      setTotal(res.data.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [page, perPage])

  useEffect(() => { loadData() }, [loadData])

  const handleSSE = useCallback(() => {
    loadData()
  }, [loadData])

  useRealtimeEvent('announcement', handleSSE)

  const goToPage = (p: number) => {
    setPage(p)
    loadData(p)
  }

  const handleItemClick = (ann: ModalAnnouncement) => {
    setSelectedAnn(ann)
  }

  const handleDismissed = useCallback((id: number) => {
    setItems(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    setSelectedAnn(null)
  }, [])

  const handleModalClose = useCallback(() => {
    setSelectedAnn(null)
  }, [])

  const breadcrumb = [
    { label: t('breadcrumb_home'), path: '/' },
    { label: t('page_title') },
  ]

  return (
    <Layout breadcrumb={breadcrumb} title={t('page_title')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('page_title')}</h1>
            <p>{t('page_subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="unified-card">
        {loading ? (
          <div className="announcement-admin-empty" aria-label={t('aria_loading')}>{t('aria_loading')}</div>
        ) : items.length === 0 ? (
          <div className="announcement-admin-empty">{t('page_empty')}</div>
        ) : (
          <div className="announcement-page-list">
            {items.map(ann => (
              <div
                key={ann.id}
                className={`announcement-page-item${!ann.is_read ? ' unread' : ''}`}
                onClick={() => handleItemClick(ann)}
              >
                <div className={`announcement-page-item-dot${ann.is_read ? ' read' : ''}`} />
                <div className="announcement-page-item-content">
                  <div className="announcement-page-item-header">
                    <span className="announcement-page-item-title">{ann.title}</span>
                    <span className={`announcement-type-badge ${ann.type}`}>
                      {t(`type_${ann.type}`)}
                    </span>
                    {ann.requires_acknowledgment && (
                      <span className="announcement-display-badge mandatory">
                        {t('display_mandatory')}
                      </span>
                    )}
                  </div>
                  {ann.body && (
                    <div className="announcement-page-item-body">
                      {ann.body.replace(/<[^>]*>/g, '').slice(0, 120)}
                      {ann.body.replace(/<[^>]*>/g, '').length > 120 ? '...' : ''}
                    </div>
                  )}
                  <div className="announcement-page-item-time">
                    {new Date(ann.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          perPage={perPage}
          onPageChange={goToPage}
          onPerPageChange={pp => { setPerPage(pp); setPage(1); loadData(1, pp) }}
          itemLabel={t('page_title').toLowerCase()}
        />
      )}

      {selectedAnn && (
        <AnnouncementModal
          announcement={selectedAnn}
          blocking={selectedAnn.requires_acknowledgment && !selectedAnn.is_read}
          onDismissed={handleDismissed}
          onClose={handleModalClose}
        />
      )}
    </Layout>
  )
}
