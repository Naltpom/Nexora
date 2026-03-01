import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import api from '../../api'
import { useConfirm } from '../ConfirmModal'
import type { FileStoragePolicy } from './types'
import './file_storage.scss'

export default function FileStoragePoliciesPage() {
  const { t } = useTranslation('file_storage')
  const { confirm } = useConfirm()

  const [policies, setPolicies] = useState<FileStoragePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [newResourceType, setNewResourceType] = useState('')
  const [adding, setAdding] = useState(false)

  const loadPolicies = useCallback(async () => {
    try {
      const res = await api.get<FileStoragePolicy[]>('/file-storage/admin/policies')
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
      const res = await api.put<FileStoragePolicy>(
        `/file-storage/admin/policies/${encodeURIComponent(rt)}`,
        { requires_moderation: true },
      )
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
      const res = await api.put<FileStoragePolicy>(
        `/file-storage/admin/policies/${encodeURIComponent(resourceType)}`,
        { requires_moderation: !currentValue },
      )
      setPolicies((prev) => prev.map((p) => (p.resource_type === resourceType ? res.data : p)))
    } catch {
      // silent
    }
  }, [])

  const handleDelete = useCallback(async (resourceType: string) => {
    const ok = await confirm({
      title: t('policies_confirm_delete_title'),
      message: t('policies_confirm_delete_message'),
      confirmText: t('policies_confirm_delete_btn'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/file-storage/admin/policies/${encodeURIComponent(resourceType)}`)
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
      breadcrumb={[{ label: t('admin_title'), path: '/admin/files' }, { label: t('policies_breadcrumb') }]}
      title={t('policies_title')}
    >
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('policies_title')}</h1>
            <p>{t('policies_subtitle')}</p>
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
          <span className="sr-only">{t('status_pending')}</span>
        </div>
      ) : (
        <div className="unified-card full-width-breakout card-table">
          <div className="fs-policies-add-form" onKeyDown={handleAddKeyDown}>
            <input
              type="text"
              className="fs-policies-input"
              value={newResourceType}
              onChange={(e) => setNewResourceType(e.target.value)}
              placeholder={t('policies_input_placeholder')}
              aria-label={t('policies_col_resource_type')}
            />
            <button
              className="fs-policies-btn-add"
              onClick={handleAdd}
              disabled={adding || !newResourceType.trim()}
            >
              {t('policies_btn_add')}
            </button>
          </div>

          {policies.length === 0 ? (
            <div className="table-no-match" role="status">{t('policies_none')}</div>
          ) : (
            <div className="table-container">
              <table className="unified-table" aria-label={t('aria_policies_table')}>
                <caption className="sr-only">{t('aria_policies_table')}</caption>
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
                        <div className={`fs-policies-toggle${policy.requires_moderation ? ' fs-policies-toggle--active' : ''}`}>
                          <button
                            className="fs-policies-toggle-switch"
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
                          className="fs-file-action-btn fs-file-action-btn--danger"
                          onClick={() => handleDelete(policy.resource_type)}
                        >
                          {t('btn_delete')}
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
