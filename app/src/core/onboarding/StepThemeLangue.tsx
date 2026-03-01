import { useTranslation } from 'react-i18next'

interface StepThemeLangueProps {
  theme: string
  language: string
  onThemeChange: (value: string) => void
  onLanguageChange: (value: string) => void
}

const LANGUAGES = [
  { code: 'fr', labelKey: 'lang_fr' },
  { code: 'en', labelKey: 'lang_en' },
]

export default function StepThemeLangue({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
}: StepThemeLangueProps) {
  const { t } = useTranslation('onboarding')

  return (
    <div>
      <h2 className="onboarding-step-title">{t('step_theme_title')}</h2>
      <p className="onboarding-step-subtitle">{t('step_theme_subtitle')}</p>

      <div className="onboarding-section-label">{t('label_theme')}</div>
      <div className="onboarding-theme-cards">
        <button
          type="button"
          className={`onboarding-theme-card onboarding-theme-card--light${theme === 'light' ? ' onboarding-theme-card--active' : ''}`}
          onClick={() => onThemeChange('light')}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          {t('theme_light')}
        </button>
        <button
          type="button"
          className={`onboarding-theme-card onboarding-theme-card--dark${theme === 'dark' ? ' onboarding-theme-card--active' : ''}`}
          onClick={() => onThemeChange('dark')}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          {t('theme_dark')}
        </button>
      </div>

      <div className="onboarding-section-label">{t('label_language')}</div>
      <div className="onboarding-langue-grid">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={`onboarding-langue-card${language === lang.code ? ' onboarding-langue-card--active' : ''}`}
            onClick={() => onLanguageChange(lang.code)}
          >
            {t(lang.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
