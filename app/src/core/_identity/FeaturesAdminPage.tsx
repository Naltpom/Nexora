import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from '../../core/Layout'
import { useConfirm } from '../../core/ConfirmModal'
import { usePermission } from '../PermissionContext'
import api from '../../api'
import './_identity.scss'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Feature {
  name: string
  label: string
  description: string
  parent: string | null
  children: string[]
  depends: string[]
  permissions: string[]
  is_core: boolean
  active: boolean
  has_routes: boolean
}

/* ------------------------------------------------------------------ */
/*  FeatureTableRow (memoized)                                        */
/* ------------------------------------------------------------------ */

interface FeatureTableRowProps {
  feature: Feature
  isChild: boolean
  toggling: string | null
  canManage: boolean
  onToggle: (feature: Feature) => void
  onPermissionsClick: (feature: Feature) => void
  onChildrenClick: (feature: Feature) => void
  onBadgeKeyDown: (e: React.KeyboardEvent, action: () => void) => void
  t: (key: string, opts?: Record<string, any>) => string
}

const FeatureTableRow = memo(function FeatureTableRow({
  feature,
  isChild,
  toggling,
  canManage,
  onToggle,
  onPermissionsClick,
  onChildrenClick,
  onBadgeKeyDown,
  t,
}: FeatureTableRowProps) {
  return (
    <tr className={feature.active ? '' : 'opacity-60'}>
      {/* Feature name */}
      <td className={isChild ? 'feature-child-indent' : undefined}>
        <div className="feature-name-col">
          {isChild && (
            <span className="feature-child-arrow" aria-hidden="true">&#x2514;</span>
          )}
          <div>
            <div className="font-medium">{feature.label}</div>
            <code className="text-gray-400-code">{feature.name}</code>
          </div>
        </div>
      </td>

      {/* Description */}
      <td className="feature-desc-col">
        {feature.description || '\u2014'}
      </td>

      {/* Status */}
      <td>
        <span className={`badge ${feature.active ? 'badge-success' : 'badge-warning'} text-xs`}>
          {feature.active ? t('common.active') : t('common.inactive')}
        </span>
      </td>

      {/* Info badges */}
      <td>
        <div className="flex-row-xs flex-wrap">
          {feature.is_core && (
            <span className="badge badge-secondary text-xs">Core</span>
          )}
          {feature.has_routes && (
            <span className="badge badge-secondary text-xs">Routes</span>
          )}
          {feature.permissions.length > 0 && (
            <span
              className="badge badge-secondary text-xs cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => onPermissionsClick(feature)}
              onKeyDown={(e) => onBadgeKeyDown(e, () => onPermissionsClick(feature))}
              aria-label={t('features_admin.tooltip_view_permissions')}
            >
              {feature.permissions.length > 1 ? t('features_admin.badge_perms_plural', { count: feature.permissions.length }) : t('features_admin.badge_perms', { count: feature.permissions.length })}
            </span>
          )}
          {feature.children.length > 0 && (
            <span
              className="badge badge-secondary text-xs cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => onChildrenClick(feature)}
              onKeyDown={(e) => onBadgeKeyDown(e, () => onChildrenClick(feature))}
              aria-label={t('features_admin.tooltip_view_children')}
            >
              {feature.children.length > 1 ? t('features_admin.badge_children_plural', { count: feature.children.length }) : t('features_admin.badge_children', { count: feature.children.length })}
            </span>
          )}
        </div>
      </td>

      {/* Dependencies */}
      <td className="text-gray-500-sm">
        {feature.depends.length > 0 ? feature.depends.join(', ') : '\u2014'}
      </td>

      {/* Toggle */}
      <td className="text-center">
        {feature.is_core ? (
          <span className="feature-locked">
            {t('features_admin.locked')}
          </span>
        ) : (
          <label className="toggle" aria-label={t('a11y.toggle_feature', { label: feature.label })}>
            <input
              type="checkbox"
              checked={feature.active}
              onChange={() => onToggle(feature)}
              disabled={toggling === feature.name || !canManage}
              aria-checked={feature.active}
            />
            <span className="toggle-slider" aria-hidden="true" />
          </label>
        )}
      </td>
    </tr>
  )
})

/* ------------------------------------------------------------------ */
/*  Composant principal                                               */
/* ------------------------------------------------------------------ */

export default function FeaturesAdminPage() {
  const { t } = useTranslation('_identity')
  const { confirm } = useConfirm()
  const { can } = usePermission()
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchValue, setSearchValue] = useState('')

  // Detail modal
  interface DetailItem { code: string; label?: string; description?: string }
  const [detailModal, setDetailModal] = useState<{ title: string; items: DetailItem[]; loading: boolean } | null>(null)
  const detailModalRef = useRef<HTMLDivElement>(null)
  const detailModalTitleId = 'features-detail-modal-title'

  // Escape key handler for detail modal
  useEffect(() => {
    if (!detailModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailModal(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    // Focus trap: focus the modal on open
    detailModalRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [detailModal])

  const loadFeatures = useCallback(async () => {
    try {
      const res = await api.get('/features/')
      setFeatures(res.data)
    } catch {
      setMessage({ type: 'error', text: t('features_admin.load_error') })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFeatures()
  }, [loadFeatures])

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(value.toLowerCase())
    }, 200)
  }

  const handleToggle = async (feature: Feature) => {
    const action = feature.active ? t('features_admin.confirm_toggle_action_deactivate') : t('features_admin.confirm_toggle_action_activate')
    const confirmed = await confirm({
      title: feature.active ? t('features_admin.confirm_toggle_title_deactivate') : t('features_admin.confirm_toggle_title_activate'),
      message: t('features_admin.confirm_toggle_message', { action, label: feature.label }) +
        (feature.active && feature.children.length > 0
          ? '\n\n' + t('features_admin.confirm_toggle_children_warning', { count: feature.children.length })
          : ''),
      confirmText: feature.active ? t('features_admin.confirm_toggle_btn_deactivate') : t('features_admin.confirm_toggle_btn_activate'),
      variant: feature.active ? 'warning' : 'info',
    })
    if (!confirmed) return

    setToggling(feature.name)
    setMessage(null)
    try {
      const res = await api.put(`/features/${feature.name}/toggle`, { active: !feature.active })
      const cascaded: string[] = res.data.cascaded || []
      const cascadeText = cascaded.length > 0 ? ' ' + t('features_admin.toggle_cascade_suffix', { count: cascaded.length, names: cascaded.join(', ') }) : ''
      setMessage({ type: 'success', text: (!feature.active ? t('features_admin.toggle_success_activated', { label: feature.label }) : t('features_admin.toggle_success_deactivated', { label: feature.label })) + cascadeText })
      await loadFeatures()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || t('features_admin.toggle_error', { label: feature.label }) })
    } finally {
      setToggling(null)
    }
  }

  const handleBadgeKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }, [])

  const handlePermissionsClick = useCallback(async (feature: Feature) => {
    setDetailModal({
      title: t('features_admin.permissions_of', { label: feature.label }),
      items: [],
      loading: true,
    })
    try {
      const res = await api.get('/permissions/', { params: { feature: feature.name } })
      setDetailModal({
        title: t('features_admin.permissions_of', { label: feature.label }),
        items: res.data.map((p: any) => ({ code: p.code, label: p.label, description: p.description })),
        loading: false,
      })
    } catch {
      setDetailModal({
        title: t('features_admin.permissions_of', { label: feature.label }),
        items: feature.permissions.map(code => ({ code })),
        loading: false,
      })
    }
  }, [t])

  const handleChildrenClick = useCallback((feature: Feature) => {
    const childItems = feature.children.map(name => {
      const child = features.find(f => f.name === name)
      return {
        code: name,
        label: child?.label,
        description: child?.description,
      }
    })
    setDetailModal({
      title: t('features_admin.children_of', { label: feature.label }),
      items: childItems,
      loading: false,
    })
  }, [features, t])

  // --- Group features: parents first, then children ---
  const rootFeatures = features.filter(f => !f.parent).sort((a, b) => a.name.localeCompare(b.name))
  const childrenMap = features.reduce<Record<string, Feature[]>>((acc, f) => {
    if (f.parent) {
      if (!acc[f.parent]) acc[f.parent] = []
      acc[f.parent].push(f)
    }
    return acc
  }, {})
  for (const children of Object.values(childrenMap)) {
    children.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Build ordered list: parent then its children (alpha sorted)
  const orderedFeatures: { feature: Feature; isChild: boolean }[] = []
  for (const root of rootFeatures) {
    orderedFeatures.push({ feature: root, isChild: false })
    if (childrenMap[root.name]) {
      for (const child of childrenMap[root.name]) {
        orderedFeatures.push({ feature: child, isChild: true })
      }
    }
  }
  // Orphan children (parent not in list)
  features
    .filter(f => f.parent && !rootFeatures.find(r => r.name === f.parent))
    .forEach(f => orderedFeatures.push({ feature: f, isChild: false }))

  // Filter by search
  const filteredFeatures = search
    ? orderedFeatures.filter(({ feature }) =>
        feature.name.toLowerCase().includes(search) ||
        feature.label.toLowerCase().includes(search) ||
        feature.description.toLowerCase().includes(search)
      )
    : orderedFeatures

  return (
    <Layout breadcrumb={[{ label: t('common.home'), path: '/' }, { label: t('features_admin.breadcrumb_features') }]} title={t('features_admin.page_title')}>
      <div className="unified-card page-header-card">
        <div className="unified-page-header">
          <div className="unified-page-header-info">
            <h1>{t('features_admin.page_title')}</h1>
            <p>{t('features_admin.subtitle')}</p>
          </div>
          <div className="page-header-stats">
            <div className="page-header-stat">
              <span className="page-header-stat-value">{features.length}</span>
              <span className="page-header-stat-label">{t('stat_features')}</span>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`alert-dynamic alert-dynamic--${message.type === 'success' ? 'success' : 'error'}`}
          role={message.type === 'success' ? 'status' : 'alert'}
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="spinner" role="status" aria-busy="true">
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : features.length === 0 ? (
        <div className="unified-card empty-state">
          {t('features_admin.empty_state')}
        </div>
      ) : (
        <div className="unified-card full-width-breakout">
          {/* Search bar */}
          <div className="section-header" role="search">
            <input
              type="text"
              placeholder={t('features_admin.search_placeholder')}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-search-wide"
              aria-label={t('features_admin.search_placeholder')}
            />
          </div>

          <div className="table-container">
            <table className="unified-table">
              <caption className="sr-only">{t('a11y.table_caption_features')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('features_admin.th_feature')}</th>
                  <th scope="col">{t('features_admin.th_description')}</th>
                  <th scope="col">{t('features_admin.th_status')}</th>
                  <th scope="col">{t('features_admin.th_info')}</th>
                  <th scope="col">{t('features_admin.th_dependencies')}</th>
                  <th scope="col" className="text-center">{t('features_admin.th_toggle')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeatures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-state-sm">
                      {search ? t('features_admin.empty_search') : t('features_admin.empty_state')}
                    </td>
                  </tr>
                ) : (
                  filteredFeatures.map(({ feature, isChild }) => (
                    <FeatureTableRow
                      key={feature.name}
                      feature={feature}
                      isChild={isChild}
                      toggling={toggling}
                      canManage={can('features.manage')}
                      onToggle={handleToggle}
                      onPermissionsClick={handlePermissionsClick}
                      onChildrenClick={handleChildrenClick}
                      onBadgeKeyDown={handleBadgeKeyDown}
                      t={t}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail modal (permissions / children list) */}
      {detailModal && (
        <div className="modal-overlay" onClick={() => setDetailModal(null)}>
          <div
            className="modal modal-narrow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailModalTitleId}
            ref={detailModalRef}
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 id={detailModalTitleId}>{detailModal.title}</h2>
              <button className="modal-close" onClick={() => setDetailModal(null)} aria-label={t('common.close')}>&times;</button>
            </div>
            <div className="modal-body modal-body-scroll">
              {detailModal.loading ? (
                <div className="text-center p-24" aria-busy="true">
                  <div className="spinner" role="status">
                    <span className="sr-only">{t('common.loading')}</span>
                  </div>
                </div>
              ) : detailModal.items.length === 0 ? (
                <p className="text-gray-400 text-center">{t('common.no_element')}</p>
              ) : (
                <div className="flex-col-sm">
                  {detailModal.items.map((item) => (
                    <div
                      key={item.code}
                      className="detail-item"
                    >
                      {item.label && (
                        <div className="detail-item-label">{item.label}</div>
                      )}
                      <code className="text-gray-500-code">{item.code}</code>
                      {item.description && (
                        <div className="detail-item-desc">{item.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailModal(null)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
