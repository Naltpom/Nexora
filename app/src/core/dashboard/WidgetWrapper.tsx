import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import type { WidgetConfig, WidgetSize, WidgetHeight } from './useDashboard'
import { SIZE_OPTIONS, HEIGHT_OPTIONS } from './useDashboard'

const StatWidget = lazy(() => import('./widgets/StatWidget'))
const ActivityWidget = lazy(() => import('./widgets/ActivityWidget'))
const SystemHealthWidget = lazy(() => import('./widgets/SystemHealthWidget'))
const QuickLinksWidget = lazy(() => import('./widgets/QuickLinksWidget'))
const FeatureShowcaseWidget = lazy(() => import('./widgets/FeatureShowcaseWidget'))
const WelcomeBannerWidget = lazy(() => import('./widgets/WelcomeBannerWidget'))
const SpacerWidget = lazy(() => import('./widgets/SpacerWidget'))

interface WidgetProps {
  widgetId: string
  size: WidgetSize
}

const WIDGET_MAP: Record<string, React.LazyExoticComponent<React.ComponentType<WidgetProps>>> = {
  stats_users: StatWidget,
  stats_notifications: StatWidget,
  stats_invitations: StatWidget,
  stats_events: StatWidget,
  activity_feed: ActivityWidget,
  system_health: SystemHealthWidget,
  quick_links_user: QuickLinksWidget,
  quick_links_admin: QuickLinksWidget,
  feature_showcase: FeatureShowcaseWidget,
  welcome_banner: WelcomeBannerWidget,
  spacer: SpacerWidget,
}

interface WidgetWrapperProps {
  widget: WidgetConfig
  editMode: boolean
  dragAttributes?: Record<string, any>
  dragListeners?: Record<string, any>
  onRemove: () => void
  onResize: (size: WidgetSize) => void
  onResizeHeight: (height: WidgetHeight) => void
}

export default function WidgetWrapper({
  widget,
  editMode,
  dragAttributes,
  dragListeners,
  onRemove,
  onResize,
  onResizeHeight,
}: WidgetWrapperProps) {
  const { t } = useTranslation('dashboard')
  const Component = WIDGET_MAP[widget.widget_id]

  if (!Component) {
    return (
      <div className="dashboard-widget dashboard-widget--unknown">
        <p className="text-muted">{t('unknown_widget', { id: widget.widget_id })}</p>
      </div>
    )
  }

  return (
    <div className={`dashboard-widget${editMode ? ' dashboard-widget--edit' : ''}${widget.widget_id === 'spacer' ? ' dashboard-widget--spacer' : ''}`}>
      {editMode && (
        <div className="dashboard-widget-toolbar">
          <button
            className="dashboard-widget-drag"
            {...dragAttributes}
            {...dragListeners}
            aria-label={t('drag_handle')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="4" r="2" />
              <circle cx="16" cy="4" r="2" />
              <circle cx="8" cy="12" r="2" />
              <circle cx="16" cy="12" r="2" />
              <circle cx="8" cy="20" r="2" />
              <circle cx="16" cy="20" r="2" />
            </svg>
          </button>
          <div className="dashboard-widget-actions">
            <select
              className="dashboard-widget-select"
              value={widget.size}
              onChange={e => onResize(e.target.value as WidgetSize)}
              aria-label={t('resize')}
            >
              {SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{t(`size_short_${s.replace('-', '_')}`)}</option>
              ))}
            </select>
            <select
              className="dashboard-widget-select"
              value={widget.height || 1}
              onChange={e => onResizeHeight(Number(e.target.value) as WidgetHeight)}
              aria-label={t('resize_height')}
            >
              {HEIGHT_OPTIONS.map(h => (
                <option key={h} value={h}>{t(`height_short_${h}`)}</option>
              ))}
            </select>
            <button
              className="dashboard-widget-remove"
              onClick={onRemove}
              aria-label={t('remove_widget')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <Suspense
        fallback={
          <div className="dashboard-widget-skeleton">
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text skeleton-text-sm" />
          </div>
        }
      >
        <Component widgetId={widget.widget_id} size={widget.size} />
      </Suspense>
    </div>
  )
}
