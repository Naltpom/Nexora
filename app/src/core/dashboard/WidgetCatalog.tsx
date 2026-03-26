import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { WidgetDefinition, WidgetConfig, WidgetSize, WidgetHeight } from './useDashboard'

interface WidgetCatalogProps {
  available: WidgetDefinition[]
  current: WidgetConfig[]
  onAdd: (id: string, size: WidgetSize, height: WidgetHeight) => void
  onClose: () => void
}

const CATEGORY_ORDER = ['business', 'charts', 'monitoring', 'stats', 'activity', 'system', 'links', 'info']

export default function WidgetCatalog({
  available,
  current,
  onAdd,
  onClose,
}: WidgetCatalogProps) {
  const { t } = useTranslation('dashboard')

  const currentIds = useMemo(
    () => new Set(current.map(w => w.widget_id)),
    [current]
  )

  const grouped = useMemo(() => {
    const groups: Record<string, WidgetDefinition[]> = {}
    for (const w of available) {
      if (!groups[w.category]) groups[w.category] = []
      groups[w.category].push(w)
    }
    return CATEGORY_ORDER
      .filter(cat => groups[cat]?.length)
      .map(cat => ({ category: cat, widgets: groups[cat] }))
  }, [available])

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-narrow" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{t('catalog_title')}</h3>
          <button className="modal-close" onClick={onClose} aria-label={t('common:close')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body modal-body-scroll">
          {grouped.map(({ category, widgets }) => (
            <div key={category} className="catalog-category">
              <h4 className="catalog-category-title">
                {t(`category_${category}`)}
              </h4>
              <div className="catalog-items">
                {widgets.map(w => {
                  const alreadyAdded = currentIds.has(w.id)
                  return (
                    <button
                      key={w.id}
                      className={`catalog-item${alreadyAdded ? ' catalog-item--disabled' : ''}`}
                      onClick={() => {
                        if (!alreadyAdded) {
                          onAdd(w.id, w.default_size as WidgetSize, (w.default_height || 1) as WidgetHeight)
                        }
                      }}
                      disabled={alreadyAdded}
                    >
                      <div className="catalog-item-info">
                        <div className="catalog-item-name">{w.label}</div>
                        <div className="catalog-item-desc">{w.description}</div>
                      </div>
                      <span className="catalog-item-size">{w.default_size}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
