import { useState, useEffect, useCallback, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../Layout'
import { useConfirm } from '../ConfirmModal'
import { usePermission } from '../PermissionContext'
import { type MultiSelectOption } from '../MultiSelect'
import FeatureFlagForm, { type FlagFormData } from './FeatureFlagForm'
import FlagPreview from './FlagPreview'
import api from '../../api'
import './feature_flags.scss'

interface FeatureFlagItem {
  id: number
  feature_name: string
  feature_label: string | null
  is_feature_active: boolean | null
  strategy: string
  description: string | null
  rollout_percentage: number
  target_roles: string[] | null
  target_users: number[] | null
  variants: { name: string; weight: number }[] | null
  is_enabled: boolean
  created_by_id: number | null
  created_by_name: string | null
  updated_by_id: number | null
  created_at: string
  updated_at: string
}

interface FeatureOption {
  value: string
  label: string
}

const DEFAULT_FORM: FlagFormData = {
  feature_name: '',
  strategy: 'boolean',
  description: '',
  rollout_percentage: 100,
  target_roles: [],
  target_users: '',
  variants: [
    { name: 'A', weight: 50 },
    { name: 'B', weight: 50 },
  ],
  is_enabled: true,
}

export default function FeatureFlagsAdmin() {
  const { t } = useTranslation('feature_flags')
  const { confirm } = useConfirm()
  const { can } = usePermission()

  const [items, setItems] = useState<FeatureFlagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [form, setForm] = useState<FlagFormData>(DEFAULT_FORM)

  const [previewName, setPreviewName] = useState<string | null>(null)

  const [featureOptions, setFeatureOptions] = useState<FeatureOption[]>([])
  const [roleOptions, setRoleOptions] = useState<MultiSelectOption[]>([])

  useEffect(() => {
    api.get('/features/').then(res => {
      const features = (res.data || []).map((f: { name: string; label: string }) => ({
        value: f.name,
        label: f.label,
      }))
      setFeatureOptions(features)
    }).catch(() => { /* ignore */ })

    api.get('/roles/').then(res => {
      setRoleOptions((res.data || []).map((r: { slug: string; name: string; color: string | null }) => ({
        value: r.slug,
        label: r.name,
        color: r.color || undefined,
      })))
    }).catch(() => { /* ignore */ })
  }, [])

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/feature-flags/')
      setItems(res.data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = items.filter(item => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      item.feature_name.toLowerCase().includes(s) ||
      (item.feature_label || '').toLowerCase().includes(s) ||
      (item.description || '').toLowerCase().includes(s) ||
      item.strategy.toLowerCase().includes(s)
    )
  })

  const openCreate = () => {
    setEditingName(null)
    setForm(DEFAULT_FORM)
    setModalOpen(true)
  }

  const openEdit = (item: FeatureFlagItem) => {
    setEditingName(item.feature_name)
    setForm({
      feature_name: item.feature_name,
      strategy: item.strategy,
      description: item.description || '',
      rollout_percentage: item.rollout_percentage,
      target_roles: item.target_roles || [],
      target_users: item.target_users ? item.target_users.join(', ') : '',
      variants: item.variants || [
        { name: 'A', weight: 50 },
        { name: 'B', weight: 50 },
      ],
      is_enabled: item.is_enabled,
    })
    setModalOpen(true)
  }

  const parseUserIds = (raw: string): number[] | null => {
    if (!raw.trim()) return null
    return raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      strategy: form.strategy,
      description: form.description || null,
      is_enabled: form.is_enabled,
      rollout_percentage: form.strategy === 'percentage' ? form.rollout_percentage : 100,
      target_roles: form.strategy === 'targeted' && form.target_roles.length > 0 ? form.target_roles : null,
      target_users: form.strategy === 'targeted' ? parseUserIds(form.target_users) : null,
      variants: form.strategy === 'ab_test' ? form.variants : null,
    }

    try {
      if (editingName) {
        await api.put(`/feature-flags/${editingName}`, payload)
      } else {
        await api.post('/feature-flags/', { ...payload, feature_name: form.feature_name })
      }
      setModalOpen(false)
      loadData()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (item: FeatureFlagItem) => {
    const ok = await confirm({
      message: t('confirm_delete'),
      variant: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/feature-flags/${item.feature_name}`)
      loadData()
    } catch {
      // ignore
    }
  }

  const strategyBadge = (strategy: string) => (
    <span className={`ff-strategy-badge ${strategy}`}>
      {t(`strategy_${strategy}`)}
    </span>
  )

  const detailsCell = (item: FeatureFlagItem) => {
    if (item.strategy === 'percentage') {
      return <span className="ff-detail-text">{t('details_percentage', { percentage: item.rollout_percentage })}</span>
    }
    if (item.strategy === 'targeted') {
      const parts: string[] = []
      if (item.target_roles && item.target_roles.length > 0) {
        parts.push(t('details_roles', { count: item.target_roles.length }))
      }
      if (item.target_users && item.target_users.length > 0) {
        parts.push(t('details_users', { count: item.target_users.length }))
      }
      return <span className="ff-detail-text">{parts.join(', ') || '\u2014'}</span>
    }
    if (item.strategy === 'ab_test' && item.variants) {
      return <span className="ff-detail-text">{t('details_variants', { count: item.variants.length })}</span>
    }
    return <span className="text-secondary">{'\u2014'}</span>
  }

  const breadcrumb = [
    { label: t('breadcrumb_home'), path: '/' },
    { label: t('breadcrumb_feature_flags') },
  ]

  return (
    <Layout breadcrumb={breadcrumb} title={t('page_title')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('page_title')}</h1>
            <p>{t('page_subtitle')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{items.length}</span>
              <span className="page-header-stat-label">{t('stat_flags')}</span>
            </div>
          </div>
          <div className="unified-page-header-actions">
            {can('feature_flags.create') && (
              <button className="btn-unified-primary" onClick={openCreate}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {t('btn_create')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="unified-card">
        <div className="ff-toolbar">
          <input
            type="text"
            className="ff-search-input"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="ff-empty" aria-label={t('aria_loading')}>{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="ff-empty">{t('empty')}</div>
        ) : (
          <div className="table-container">
            <table className="unified-table" aria-label={t('aria_table')}>
              <thead>
                <tr>
                  <th>{t('col_feature')}</th>
                  <th>{t('col_strategy')}</th>
                  <th>{t('col_details')}</th>
                  <th>{t('col_status')}</th>
                  <th>{t('col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="ff-feature-cell">
                        <span className="ff-feature-name">{item.feature_label || item.feature_name}</span>
                        <span className="ff-feature-code">{item.feature_name}</span>
                      </div>
                    </td>
                    <td>{strategyBadge(item.strategy)}</td>
                    <td>{detailsCell(item)}</td>
                    <td>
                      <div className="ff-status-cell">
                        <span className={`ff-status-badge ${item.is_enabled ? 'enabled' : 'disabled'}`}>
                          {item.is_enabled ? t('status_enabled') : t('status_disabled')}
                        </span>
                        {item.is_feature_active !== null && (
                          <span className={`ff-feature-status ${item.is_feature_active ? 'active' : 'inactive'}`}>
                            {item.is_feature_active ? t('feature_active') : t('feature_inactive')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="ff-actions">
                        <button
                          className="btn-icon btn-icon-secondary"
                          onClick={() => setPreviewName(previewName === item.feature_name ? null : item.feature_name)}
                          title={t('preview_title')}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        </button>
                        {can('feature_flags.update') && (
                          <button
                            className="btn-icon btn-icon-secondary"
                            onClick={() => openEdit(item)}
                            title={t('btn_edit')}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {can('feature_flags.delete') && (
                          <button
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleDelete(item)}
                            title={t('btn_delete')}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewName && (
        <div className="unified-card">
          <FlagPreview featureName={previewName} />
        </div>
      )}

      {modalOpen && createPortal(
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal ff-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingName ? t('modal_edit_title') : t('modal_create_title')}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <FeatureFlagForm
              form={form}
              onChange={(updater) => setForm(updater)}
              onSubmit={handleSubmit}
              onCancel={() => setModalOpen(false)}
              isEdit={!!editingName}
              featureOptions={featureOptions}
              roleOptions={roleOptions}
            />
          </div>
        </div>,
        document.body,
      )}
    </Layout>
  )
}
