import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSettings } from '../AppSettingsContext'

const SSOButtons = lazy(() => import('./SSOButtons'))

function SSOSkeleton() {
  return (
    <>
      <div className="login-divider">
        <div className="login-divider-line" />
        <span className="login-divider-text-skeleton" />
        <div className="login-divider-line" />
      </div>
      <div className="sso-buttons">
        <div className="skeleton sso-btn-skeleton" />
        <div className="skeleton sso-btn-skeleton" />
      </div>
    </>
  )
}

export default function SSOSection() {
  const { settings, settled } = useAppSettings()
  const { t } = useTranslation('_identity')

  if (!settled) return <SSOSkeleton />

  const enabledProviders = settings.providers.filter(p => p.enabled)
  if (enabledProviders.length === 0) return null

  return (
    <>
      <div className="login-divider">
        <div className="login-divider-line" />
        <span className="login-divider-text">{t('login.divider_or')}</span>
        <div className="login-divider-line" />
      </div>
      <Suspense fallback={<SSOSkeleton />}>
        <SSOButtons providers={enabledProviders} />
      </Suspense>
    </>
  )
}
