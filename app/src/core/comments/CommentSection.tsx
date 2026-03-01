import { useState, useEffect, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../AuthContext'
import { usePermission } from '../PermissionContext'
import { useConfirm } from '../ConfirmModal'
import RichTextEditor from '../../core/RichTextEditor'
import type { MentionUser } from '../../core/MentionSuggestion'
import api from '../../api'
import './comments.scss'

/* -- Types -- */

interface CommentItem {
  id: number
  user_id: number
  user_email: string
  user_name: string
  resource_type: string
  resource_id: number
  content: string
  parent_id: number | null
  is_edited: boolean
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  status: string
}

interface CommentListResponse {
  items: CommentItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

interface CommentSectionProps {
  resourceType: string
  resourceId: number
}

/* -- Helpers -- */

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return t('il_y_a_maintenant')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('il_y_a_minutes', { minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('il_y_a_heures', { hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('il_y_a_jours', { days })
  return date.toLocaleDateString()
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

/** Check if HTML content is effectively empty (TipTap returns <p></p> for empty). */
function isEmptyHtml(html: string): boolean {
  const stripped = html.replace(/<[^>]*>/g, '').trim()
  return stripped.length === 0
}

/* -- Memoized comment card -- */

interface CommentCardProps {
  comment: CommentItem
  currentUserId: number
  isAdmin: boolean
  canEdit: boolean
  canDelete: boolean
  canCreate: boolean
  mentionUsers: MentionUser[]
  onEdit: (id: number, content: string) => void
  onDelete: (id: number) => void
  onReply: (id: number) => void
  replyingTo: number | null
  onReplySubmit: (parentId: number, content: string) => void
  onReplyCancel: () => void
  t: (key: string, opts?: Record<string, unknown>) => string
}

const CommentCard = memo(function CommentCard({
  comment, currentUserId, isAdmin, canEdit, canDelete, canCreate,
  mentionUsers, onEdit, onDelete, onReply, replyingTo, onReplySubmit, onReplyCancel, t,
}: CommentCardProps) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canEditThis = canEdit && (comment.user_id === currentUserId || isAdmin)
  const canDeleteThis = canDelete && (comment.user_id === currentUserId || isAdmin)

  const handleSaveEdit = async () => {
    if (isEmptyHtml(editContent)) return
    setSubmitting(true)
    await onEdit(comment.id, editContent)
    setEditing(false)
    setSubmitting(false)
  }

  const handleReplySubmit = async () => {
    if (isEmptyHtml(replyContent)) return
    setSubmitting(true)
    await onReplySubmit(comment.id, replyContent)
    setReplyContent('')
    setSubmitting(false)
  }

  return (
    <div className={`comment-item${comment.parent_id ? ' comment-item--reply' : ''}`}>
      <div className="comment-avatar" aria-hidden="true">
        {getInitials(comment.user_name || comment.user_email)}
      </div>
      <div className="comment-body">
        <div className="comment-meta">
          <span className="comment-author">{comment.user_name || comment.user_email}</span>
          <span className="comment-time">{timeAgo(comment.created_at, t)}</span>
          {comment.is_edited && (
            <span className="comment-edited-badge">({t('label_modifie')})</span>
          )}
          {comment.status === 'pending' && (
            <span className="comment-pending-badge">{t('label_pending')}</span>
          )}
        </div>

        {editing ? (
          <div className="comment-form">
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              mentionUsers={mentionUsers}
            />
            <div className="comment-form-actions">
              <button
                className="comment-btn-cancel"
                onClick={() => { setEditing(false); setEditContent(comment.content) }}
              >
                {t('btn_annuler')}
              </button>
              <button
                className="comment-btn-send"
                onClick={handleSaveEdit}
                disabled={submitting || isEmptyHtml(editContent)}
              >
                {t('btn_sauvegarder')}
              </button>
            </div>
          </div>
        ) : (
          <div className="comment-content" dangerouslySetInnerHTML={{ __html: comment.content }} />
        )}

        {!editing && (
          <div className="comment-actions">
            {canCreate && !comment.parent_id && (
              <button
                className="comment-action-btn"
                onClick={() => onReply(comment.id)}
                aria-label={t('aria_repondre')}
              >
                {t('btn_repondre')}
              </button>
            )}
            {canEditThis && (
              <button
                className="comment-action-btn"
                onClick={() => { setEditing(true); setEditContent(comment.content) }}
                aria-label={t('aria_modifier')}
              >
                {t('btn_modifier')}
              </button>
            )}
            {canDeleteThis && (
              <button
                className="comment-action-btn comment-action-btn--danger"
                onClick={() => onDelete(comment.id)}
                aria-label={t('aria_supprimer')}
              >
                {t('btn_supprimer')}
              </button>
            )}
          </div>
        )}

        {replyingTo === comment.id && (
          <div className="comment-reply-form">
            <RichTextEditor
              content={replyContent}
              onChange={setReplyContent}
              placeholder={t('placeholder_reponse')}
              mentionUsers={mentionUsers}
            />
            <div className="comment-form-actions">
              <button className="comment-btn-cancel" onClick={onReplyCancel}>
                {t('btn_annuler')}
              </button>
              <button
                className="comment-btn-send"
                onClick={handleReplySubmit}
                disabled={submitting || isEmptyHtml(replyContent)}
              >
                {t('btn_envoyer')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

/* -- Main Component -- */

export default function CommentSection({ resourceType, resourceId }: CommentSectionProps) {
  const { t } = useTranslation('comments')
  const { user } = useAuth()
  const { can } = usePermission()
  const { confirm } = useConfirm()

  const canRead = can('comments.read')
  const canCreate = can('comments.create')
  const canEdit = can('comments.update')
  const canDelete = can('comments.delete')
  const isAdmin = can('comments.admin')

  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([])

  const loadComments = useCallback(async () => {
    try {
      const res = await api.get<CommentListResponse>('/comments/', {
        params: {
          resource_type: resourceType,
          resource_id: resourceId,
          per_page: 100,
          sort_by: 'created_at',
          sort_dir: 'asc',
        },
      })
      setComments(res.data.items)
      setTotal(res.data.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [resourceType, resourceId])

  const loadMentionUsers = useCallback(async () => {
    try {
      const res = await api.get<MentionUser[]>('/comments/mentions/list')
      setMentionUsers(res.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    if (canRead) loadComments()
    if (canCreate) loadMentionUsers()
  }, [canRead, canCreate, loadComments, loadMentionUsers])

  const handleCreate = async () => {
    if (isEmptyHtml(newContent) || submitting) return
    setSubmitting(true)
    try {
      const res = await api.post<CommentItem>('/comments/', {
        resource_type: resourceType,
        resource_id: resourceId,
        content: newContent,
      })
      setComments((prev) => [...prev, res.data])
      setTotal((prev) => prev + 1)
      setNewContent('')
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  const handleReplySubmit = useCallback(async (parentId: number, content: string) => {
    try {
      const res = await api.post<CommentItem>('/comments/', {
        resource_type: resourceType,
        resource_id: resourceId,
        content,
        parent_id: parentId,
      })
      setComments((prev) => [...prev, res.data])
      setTotal((prev) => prev + 1)
      setReplyingTo(null)
    } catch {
      // silent
    }
  }, [resourceType, resourceId])

  const handleEdit = useCallback(async (id: number, content: string) => {
    try {
      const res = await api.patch<CommentItem>(`/comments/${id}`, { content })
      setComments((prev) => prev.map((c) => (c.id === id ? res.data : c)))
    } catch {
      // silent
    }
  }, [])

  const handleDelete = useCallback(async (id: number) => {
    const ok = await confirm({
      title: t('confirm_supprimer_titre'),
      message: t('confirm_supprimer_message'),
      confirmText: t('confirm_supprimer_btn'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/comments/${id}`)
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id))
      setTotal((prev) => prev - 1)
    } catch {
      // silent
    }
  }, [confirm, t])

  if (!canRead) return null

  // Build threaded list: top-level comments followed by their replies
  const topLevel = comments.filter((c) => !c.parent_id)
  const replies = comments.filter((c) => c.parent_id)
  const threaded: CommentItem[] = []
  for (const comment of topLevel) {
    threaded.push(comment)
    for (const reply of replies) {
      if (reply.parent_id === comment.id) {
        threaded.push(reply)
      }
    }
  }

  return (
    <div className="comment-section">
      <div className="comment-section-header">
        <h3>{t('titre')}</h3>
        <span className="comment-count">
          {total} {total > 1 ? t('stat_commentaires_plural') : t('stat_commentaires')}
        </span>
      </div>

      {loading ? (
        <div className="comment-loading" role="status" aria-busy="true">
          <span>{t('aria_loading')}</span>
        </div>
      ) : (
        <div className="comment-list" role="list" aria-label={t('aria_liste')}>
          {threaded.length === 0 && (
            <div className="comment-empty">
              <div>{t('aucun_commentaire')}</div>
              {canCreate && <div>{t('premier_commentaire')}</div>}
            </div>
          )}
          {threaded.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={user?.id ?? 0}
              isAdmin={isAdmin}
              canEdit={canEdit}
              canDelete={canDelete}
              canCreate={canCreate}
              mentionUsers={mentionUsers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReply={(id) => setReplyingTo(id)}
              replyingTo={replyingTo}
              onReplySubmit={handleReplySubmit}
              onReplyCancel={() => setReplyingTo(null)}
              t={t}
            />
          ))}
        </div>
      )}

      {canCreate && (
        <div className="comment-form-new">
          <div className="comment-avatar" aria-hidden="true">
            {user ? getInitials(`${user.first_name} ${user.last_name}`) : '?'}
          </div>
          <div className="comment-form-inner">
            <RichTextEditor
              content={newContent}
              onChange={setNewContent}
              placeholder={t('placeholder_nouveau')}
              mentionUsers={mentionUsers}
            />
            <div className="comment-form-actions">
              <button
                className="comment-btn-send"
                onClick={handleCreate}
                disabled={submitting || isEmptyHtml(newContent)}
                aria-label={t('aria_envoyer')}
              >
                {t('btn_envoyer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
