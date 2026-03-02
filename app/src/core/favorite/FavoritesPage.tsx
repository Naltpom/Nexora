import { useState, useEffect, useCallback, FormEvent, DragEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import Layout from '../Layout'
import { useConfirm } from '../ConfirmModal'
import { renderFavoriteIcon, ICON_OPTIONS } from './favoriteIcons'
import api from '../../api'
import './favorite.scss'

interface FavoriteItem {
  id: number
  label: string
  icon: string | null
  url: string
  position: number
  created_at: string
}

interface EditForm {
  label: string
  icon: string
}

export default function FavoritesPage() {
  const { t } = useTranslation('favorite')
  const { confirm } = useConfirm()

  const [items, setItems] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<EditForm>({ label: '', icon: '' })

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/favorites/')
      setItems(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openEdit = (fav: FavoriteItem) => {
    setEditingId(fav.id)
    setForm({ label: fav.label, icon: fav.icon || '' })
    setModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingId) return
    try {
      await api.put(`/favorites/${editingId}`, {
        label: form.label,
        icon: form.icon || null,
      })
      setModalOpen(false)
      loadData()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (fav: FavoriteItem) => {
    const ok = await confirm({
      message: t('confirm_delete'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/favorites/${fav.id}`)
      loadData()
    } catch {
      // ignore
    }
  }

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const onDragStart = (idx: number) => (e: DragEvent) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (idx: number) => (e: DragEvent) => {
    e.preventDefault()
    if (dragIdx !== null) setDragOverIdx(idx)
  }

  const onDrop = (idx: number) => (e: DragEvent) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newItems = [...items]
    const [moved] = newItems.splice(dragIdx, 1)
    newItems.splice(idx, 0, moved)
    setItems(newItems)
    setDragIdx(null)
    setDragOverIdx(null)
    api.put('/favorites/reorder', { ids: newItems.map(i => i.id) }).catch(() => loadData())
  }

  const onDragEnd = () => {
    setDragIdx(null)
    setDragOverIdx(null)
  }

  const breadcrumb = [
    { label: t('breadcrumb_home'), path: '/' },
    { label: t('breadcrumb_favorites') },
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
          <div className="favorites-page-empty" aria-label={t('aria_loading')}>{t('aria_loading')}</div>
        ) : items.length === 0 ? (
          <div className="favorites-page-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div>{t('page_empty')}</div>
            <div className="favorites-page-empty-hint">{t('page_empty_hint')}</div>
          </div>
        ) : (
          <div className="favorite-drag-list" aria-label={t('aria_table')}>
            {items.map((fav, index) => (
              <div
                key={fav.id}
                className={`favorite-drag-item${dragOverIdx === index ? ' favorite-drag-item--drag-over' : ''}`}
                draggable
                onDragStart={onDragStart(index)}
                onDragOver={onDragOver(index)}
                onDrop={onDrop(index)}
                onDragEnd={onDragEnd}
              >
                <span className="favorite-drag-handle">&#9776;</span>
                <div className="favorite-drag-info">
                  <div className="favorite-drag-label">
                    {renderFavoriteIcon(fav.icon)}
                    <span>{fav.label}</span>
                  </div>
                  <Link to={fav.url} className="favorite-drag-url" onClick={e => e.stopPropagation()}>{fav.url}</Link>
                </div>
                <div className="favorite-actions">
                  <button
                    className="btn-icon btn-icon-secondary"
                    onClick={() => openEdit(fav)}
                    title={t('btn_edit')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    onClick={() => handleDelete(fav)}
                    title={t('btn_delete')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal favorite-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('modal_edit_title')}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('field_label')}</label>
                  <input
                    type="text"
                    className="input"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder={t('field_label_placeholder')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('field_icon')}</label>
                  <div className="favorite-icon-grid">
                    {ICON_OPTIONS.map(opt => (
                      <button
                        key={opt.name}
                        type="button"
                        className={`favorite-icon-option${form.icon === opt.name ? ' active' : ''}`}
                        onClick={() => setForm(f => ({ ...f, icon: opt.name }))}
                        title={opt.name || 'star'}
                      >
                        {opt.svg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  {t('btn_cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </Layout>
  )
}
