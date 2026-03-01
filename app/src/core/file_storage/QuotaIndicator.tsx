import { useTranslation } from 'react-i18next'
import { formatSize } from './utils'
import type { QuotaInfo } from './types'
import './file_storage.scss'

interface QuotaIndicatorProps {
  quota: QuotaInfo | null
  variant?: 'bar' | 'compact'
}

export default function QuotaIndicator({ quota, variant = 'bar' }: QuotaIndicatorProps) {
  const { t } = useTranslation('file_storage')

  if (!quota) return null

  const isUnlimited = quota.max_bytes === 0
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((quota.used_bytes / quota.max_bytes) * 100))

  const level = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'ok'

  if (isUnlimited) {
    return (
      <div className={`fs-quota fs-quota--${variant}`} role="status" aria-label={t('aria_quota')}>
        <span className="fs-quota-text">
          {t('quota_files', { count: quota.file_count })} &mdash; {t('quota_unlimited')}
        </span>
      </div>
    )
  }

  return (
    <div className={`fs-quota fs-quota--${variant}`} role="status" aria-label={t('aria_quota')}>
      <div className="fs-quota-bar">
        <div
          className={`fs-quota-fill fs-quota-fill--${level}`}
          style={{ '--fs-quota-pct': `${percentage}%` } as React.CSSProperties}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('aria_progress', { percent: percentage })}
        >
          <div className="fs-quota-fill-inner" />
        </div>
      </div>
      <span className="fs-quota-text">
        {t('quota_used', { used: formatSize(quota.used_bytes, t), max: formatSize(quota.max_bytes, t) })}
      </span>
    </div>
  )
}
