import { useTranslation } from 'react-i18next'
import type { AccessibilitePrefs } from '../preference/applyPreferences'
import '../preference/accessibilite/accessibilite.scss'

interface StepAccessibiliteProps {
  prefs: AccessibilitePrefs
  onToggle: (key: keyof AccessibilitePrefs, value: boolean) => void
}

const TOGGLE_KEYS: { key: keyof AccessibilitePrefs; labelKey: string; descKey: string }[] = [
  { key: 'highContrast', labelKey: 'a11y_high_contrast_label', descKey: 'a11y_high_contrast_desc' },
  { key: 'reduceMotion', labelKey: 'a11y_reduce_motion_label', descKey: 'a11y_reduce_motion_desc' },
  { key: 'dyslexia', labelKey: 'a11y_dyslexia_label', descKey: 'a11y_dyslexia_desc' },
  { key: 'focusVisible', labelKey: 'a11y_focus_visible_label', descKey: 'a11y_focus_visible_desc' },
  { key: 'underlineLinks', labelKey: 'a11y_underline_links_label', descKey: 'a11y_underline_links_desc' },
  { key: 'largeTargets', labelKey: 'a11y_large_targets_label', descKey: 'a11y_large_targets_desc' },
]

export default function StepAccessibilite({ prefs, onToggle }: StepAccessibiliteProps) {
  const { t } = useTranslation('onboarding')

  return (
    <div>
      <h2 className="onboarding-step-title">{t('step_a11y_title')}</h2>
      <p className="onboarding-step-subtitle">{t('step_a11y_subtitle')}</p>

      <div className="onboarding-a11y-list">
        {TOGGLE_KEYS.map((toggle) => (
          <label key={toggle.key} className="onboarding-a11y-item">
            <div className="onboarding-a11y-text">
              <span className="onboarding-a11y-label">{t(toggle.labelKey)}</span>
              <span className="onboarding-a11y-desc">{t(toggle.descKey)}</span>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={!!prefs[toggle.key]}
              onChange={(e) => onToggle(toggle.key, e.target.checked)}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
