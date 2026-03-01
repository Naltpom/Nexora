import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import { useConfirm } from '../ConfirmModal'
import './comments.scss'

/* -- Types -- */

interface Policy {
  resource_type: string
  requires_moderation: boolean
  updated_at: string
  updated_by_id: number | null
}

/* -- Component -- */

export default function CommentPoliciesPage() {
  const { t } = useTranslation('comments')
  const { confirm } = useConfirm()

  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [newResourceType, setNewResourceType] = useState('')
  const [adding, setAdding] = useState(false)

  const loadPolicies = useCallback(async () => {
    try {
      const res = await api.get<Policy[]>('/comments/admin/policies')
      setPolicies(res.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPolicies() }, [loadPolicies])

  const handleAdd = async () => {
    const rt = newResourceType.trim()
    if (!rt || adding) return
    setAdding(true)
    try {
      const res = await api.put<Policy>(`/comments/admin/policies/${encodeURIComponent(rt)}`, {
        resource_type: rt,
        requires_moderation: true,
      })
      setPolicies((prev) => [...prev, res.data].sort((a, b) => a.resource_type.localeCompare(b.resource_type)))
      setNewResourceType('')
    } catch {
      // silent
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = useCallback(async (resourceType: string, currentValue: boolean) => {
    try {
      const res = await api.put<Policy>(`/comments/admin/policies/${encodeURIComponent(resourceType)}`, {
        resource_type: resourceType,
        requires_moderation: !currentValue,
      })
      setPolicies((prev) => prev.map((p) => (p.resource_type === resourceType ? res.data : p)))
    } catch {
      // silent
    }
  }, [])

  const handleDelete = useCallback(async (resourceType: string) => {
    const ok = await confirm({
      title: t('policies_confirm_supprimer_titre'),
      message: t('policies_confirm_supprimer_message'),
      confirmText: t('confirm_supprimer_btn'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/comments/admin/policies/${encodeURIComponent(resourceType)}`)
      setPolicies((prev) => prev.filter((p) => p.resource_type !== resourceType))
    } catch {
      // silent
    }
  }, [confirm, t])

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleString()

  return (
    <Layout
      breadcrumb={[{ label: t('policies_titre'), path: '/admin/comments/policies' }, { label: t('policies_breadcrumb') }]}
      title={t('policies_titre')}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('policies_titre')}</h1>
            <p>{t('policies_sous_titre')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{policies.length}</span>
              <span className="page-header-stat-label">{t('policies_col_resource_type')}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" aria-busy="true" role="status">
          <span className="sr-only">{t('aria_loading')}</span>
        </div>
      ) : (
        <div className="unified-card full-width-breakout card-table">
          <div className="policies-add-form" onKeyDown={handleAddKeyDown}>
            <input
              type="text"
              className="policies-input"
              value={newResourceType}
              onChange={(e) => setNewResourceType(e.target.value)}
              placeholder={t('policies_input_placeholder')}
              aria-label={t('policies_col_resource_type')}
            />
            <button
              className="comment-btn-send"
              onClick={handleAdd}
              disabled={adding || !newResourceType.trim()}
            >
              {t('policies_btn_ajouter')}
            </button>
          </div>

          {policies.length === 0 ? (
            <div className="table-no-match" role="status">{t('policies_aucune')}</div>
          ) : (
            <div className="table-container">
              <table className="unified-table" aria-label={t('policies_aria_table')}>
                <caption className="sr-only">{t('policies_aria_table')}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t('policies_col_resource_type')}</th>
                    <th scope="col">{t('policies_col_moderation')}</th>
                    <th scope="col">{t('policies_col_updated')}</th>
                    <th scope="col">{t('policies_col_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((policy) => (
                    <tr key={policy.resource_type}>
                      <td>
                        <code className="badge-tag badge-tag--mono">{policy.resource_type}</code>
                      </td>
                      <td>
                        <div className="policies-toggle">
                          <button
                            className={`policies-toggle-switch${policy.requires_moderation ? ' active' : ''}`}
                            onClick={() => handleToggle(policy.resource_type, policy.requires_moderation)}
                            role="switch"
                            aria-checked={policy.requires_moderation}
                            aria-label={t('policies_col_moderation')}
                          />
                          <span>{policy.requires_moderation ? t('policies_toggle_on') : t('policies_toggle_off')}</span>
                        </div>
                      </td>
                      <td className="text-gray-500-sm nowrap">{formatDate(policy.updated_at)}</td>
                      <td>
                        <button
                          className="comments-admin-btn comments-admin-btn--delete"
                          onClick={() => handleDelete(policy.resource_type)}
                        >
                          {t('btn_supprimer')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
