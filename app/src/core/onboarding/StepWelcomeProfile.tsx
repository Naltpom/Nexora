import { useTranslation } from 'react-i18next'
import { useAppSettings } from '../AppSettingsContext'

interface StepWelcomeProfileProps {
  firstName: string
  lastName: string
  onFirstNameChange: (value: string) => void
  onLastNameChange: (value: string) => void
}

export default function StepWelcomeProfile({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: StepWelcomeProfileProps) {
  const { t } = useTranslation('onboarding')
  const { settings } = useAppSettings()

  return (
    <div>
      <div className="onboarding-welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
      <h2 className="onboarding-step-title">
        {t('step_welcome_title', { appName: settings.app_name })}
      </h2>
      <p className="onboarding-step-subtitle">{t('step_welcome_subtitle')}</p>

      <div className="onboarding-profile-form">
        <div className="form-group">
          <label>{t('label_first_name')}</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder={t('placeholder_first_name')}
          />
        </div>
        <div className="form-group">
          <label>{t('label_last_name')}</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder={t('placeholder_last_name')}
          />
        </div>
      </div>
    </div>
  )
}
