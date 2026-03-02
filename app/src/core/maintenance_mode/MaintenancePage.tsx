import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import './maintenance_mode.scss'

interface Props {
  message?: string | null
  scheduledEnd?: string | null
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const { t } = useTranslation('maintenance_mode')
  const [remaining, setRemaining] = useState(getRemainingTime(targetDate))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemainingTime(targetDate))
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (remaining.total <= 0) return null

  return (
    <div>
      <div className="maintenance-countdown-label">{t('countdown_label')}</div>
      <div className="maintenance-countdown">
        {remaining.days > 0 && (
          <div className="maintenance-countdown-segment">
            <span className="maintenance-countdown-value">{remaining.days}</span>
            <span className="maintenance-countdown-unit">{t('countdown_days')}</span>
          </div>
        )}
        <div className="maintenance-countdown-segment">
          <span className="maintenance-countdown-value">{String(remaining.hours).padStart(2, '0')}</span>
          <span className="maintenance-countdown-unit">{t('countdown_hours')}</span>
        </div>
        <div className="maintenance-countdown-segment">
          <span className="maintenance-countdown-value">{String(remaining.minutes).padStart(2, '0')}</span>
          <span className="maintenance-countdown-unit">{t('countdown_minutes')}</span>
        </div>
        <div className="maintenance-countdown-segment">
          <span className="maintenance-countdown-value">{String(remaining.seconds).padStart(2, '0')}</span>
          <span className="maintenance-countdown-unit">{t('countdown_seconds')}</span>
        </div>
      </div>
    </div>
  )
}

function getRemainingTime(targetDate: string) {
  const total = new Date(targetDate).getTime() - Date.now()
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }

  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

export default function MaintenancePage({ message, scheduledEnd }: Props) {
  const { t } = useTranslation('maintenance_mode')

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <div className="maintenance-page">
      <div className="maintenance-card">
        <div className="maintenance-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        <h1 className="maintenance-title">{t('title')}</h1>
        <p className="maintenance-message">{message || t('default_message')}</p>

        {scheduledEnd && <CountdownTimer targetDate={scheduledEnd} />}

        <button className="maintenance-retry-btn" onClick={handleRetry}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {t('retry')}
        </button>
      </div>
    </div>
  )
}
