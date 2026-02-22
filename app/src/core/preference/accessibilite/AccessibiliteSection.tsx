import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraftPreference } from '../DraftPreferenceContext'
import { applyAccessibilitePrefs, type AccessibilitePrefs } from '../applyPreferences'
import './accessibilite.scss'

const DEFAULTS: AccessibilitePrefs = {
  highContrast: false,
  reduceMotion: false,
  dyslexia: false,
  focusVisible: false,
  underlineLinks: false,
  largeTargets: false,
}

const TOGGLE_KEYS: { key: keyof AccessibilitePrefs; labelKey: string; descKey: string }[] = [
  { key: 'highContrast', labelKey: 'toggle_high_contrast_label', descKey: 'toggle_high_contrast_desc' },
  { key: 'reduceMotion', labelKey: 'toggle_reduce_motion_label', descKey: 'toggle_reduce_motion_desc' },
  { key: 'dyslexia', labelKey: 'toggle_dyslexia_label', descKey: 'toggle_dyslexia_desc' },
  { key: 'focusVisible', labelKey: 'toggle_focus_visible_label', descKey: 'toggle_focus_visible_desc' },
  { key: 'underlineLinks', labelKey: 'toggle_underline_links_label', descKey: 'toggle_underline_links_desc' },
  { key: 'largeTargets', labelKey: 'toggle_large_targets_label', descKey: 'toggle_large_targets_desc' },
]

export default function AccessibiliteSection() {
  const { t } = useTranslation('preference.accessibilite')
  const { getDraftPreference, setDraftPreference, resetVersion } = useDraftPreference()

  const [prefs, setPrefs] = useState<AccessibilitePrefs>(() => {
    const saved = getDraftPreference('accessibilite', null)
    return saved && typeof saved === 'object' ? saved : { ...DEFAULTS }
  })

  // Re-sync when draft is discarded
  useEffect(() => {
    const saved = getDraftPreference('accessibilite', null)
    setPrefs(saved && typeof saved === 'object' ? saved : { ...DEFAULTS })
  }, [resetVersion])

  useEffect(() => {
    applyAccessibilitePrefs(prefs)
  }, [prefs])

  const update = (key: keyof AccessibilitePrefs, value: boolean) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    setDraftPreference('accessibilite', next)
  }

  const activeCount = TOGGLE_KEYS.filter((tk) => prefs[tk.key]).length

  const isModified = activeCount > 0

  const handleReset = () => {
    setPrefs({ ...DEFAULTS })
    setDraftPreference('accessibilite', DEFAULTS)
    applyAccessibilitePrefs(null)
  }

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">{t('section_title')}</h2>
      <p className="text-secondary">
        {t('section_description')}
        {activeCount > 0 && (
          <span className="a11y-section__active-count">
            {activeCount} {activeCount > 1 ? t('active_count_plural') : t('active_count_singular')}
          </span>
        )}
      </p>

      <div className="a11y-section__list">
        {TOGGLE_KEYS.map((toggle) => (
          <label key={toggle.key} className="a11y-section__item">
            <div className="a11y-section__item-text">
              <span className="a11y-section__item-label">{t(toggle.labelKey)}</span>
              <span className="a11y-section__item-desc">{t(toggle.descKey)}</span>
            </div>
            <input
              type="checkbox"
              className="toggle"
              checked={!!prefs[toggle.key]}
              onChange={(e) => update(toggle.key, e.target.checked)}
            />
          </label>
        ))}
      </div>

      {isModified && (
        <div className="a11y-section__actions">
          <button className="btn btn-secondary" onClick={handleReset} type="button">
            {t('btn_disable_all')}
          </button>
        </div>
      )}
    </div>
  )
}
