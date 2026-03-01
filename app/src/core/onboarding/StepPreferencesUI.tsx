import { useTranslation } from 'react-i18next'

interface StepPreferencesUIProps {
  density: string
  fontScale: number
  radius: number
  onDensityChange: (value: string) => void
  onFontScaleChange: (value: number) => void
  onRadiusChange: (value: number) => void
}

const DENSITIES = [
  { value: 'compact', labelKey: 'density_compact' },
  { value: 'normal', labelKey: 'density_normal' },
  { value: 'airy', labelKey: 'density_airy' },
]

export default function StepPreferencesUI({
  density,
  fontScale,
  radius,
  onDensityChange,
  onFontScaleChange,
  onRadiusChange,
}: StepPreferencesUIProps) {
  const { t } = useTranslation('onboarding')

  return (
    <div>
      <h2 className="onboarding-step-title">{t('step_prefs_title')}</h2>
      <p className="onboarding-step-subtitle">{t('step_prefs_subtitle')}</p>

      <div className="onboarding-prefs-grid">
        {/* Density */}
        <div className="onboarding-prefs-field">
          <div className="onboarding-prefs-label">{t('label_density')}</div>
          <div className="onboarding-density-buttons">
            {DENSITIES.map((d) => (
              <button
                key={d.value}
                type="button"
                className={`onboarding-density-btn${density === d.value ? ' onboarding-density-btn--active' : ''}`}
                onClick={() => onDensityChange(d.value)}
              >
                {t(d.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Font scale */}
        <div className="onboarding-prefs-field">
          <div className="onboarding-prefs-label">
            {t('label_font_scale')}
            <span className="onboarding-prefs-value">{fontScale}%</span>
          </div>
          <input
            type="range"
            className="onboarding-prefs-slider"
            min={85}
            max={125}
            step={5}
            value={fontScale}
            onChange={(e) => onFontScaleChange(Number(e.target.value))}
          />
        </div>

        {/* Border radius */}
        <div className="onboarding-prefs-field">
          <div className="onboarding-prefs-label">
            {t('label_border_radius')}
            <span className="onboarding-prefs-value">{radius}px</span>
          </div>
          <input
            type="range"
            className="onboarding-prefs-slider"
            min={0}
            max={16}
            step={2}
            value={radius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
          />
        </div>

        {/* Preview */}
        <div className="onboarding-prefs-preview">
          {t('preview_text')}
        </div>
      </div>
    </div>
  )
}
