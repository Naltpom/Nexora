import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraftPreference } from '../DraftPreferenceContext'
import { applyLayoutPrefs, type LayoutPrefs } from '../applyPreferences'
import './layout.scss'

const DENSITY_OPTION_KEYS = [
  { value: 'compact', key: 'density_compact' },
  { value: 'normal', key: 'density_normal' },
  { value: 'airy', key: 'density_airy' },
]

const WIDTH_OPTION_KEYS = [
  { value: 'narrow', key: 'width_narrow' },
  { value: 'normal', key: 'width_normal' },
  { value: 'wide', key: 'width_wide' },
  { value: 'full', key: 'width_full' },
]

const DEFAULTS: LayoutPrefs = { density: 'normal', radius: 8, maxWidth: 'normal', sectionGap: 24 }

export default function LayoutSection() {
  const { t } = useTranslation('preference.layout')
  const { getDraftPreference, setDraftPreference, resetVersion } = useDraftPreference()

  const [prefs, setPrefs] = useState<LayoutPrefs>(() => {
    const saved = getDraftPreference('layout', null)
    return saved && typeof saved === 'object' ? saved : { ...DEFAULTS }
  })

  // Re-sync when draft is discarded
  useEffect(() => {
    const saved = getDraftPreference('layout', null)
    setPrefs(saved && typeof saved === 'object' ? saved : { ...DEFAULTS })
  }, [resetVersion])

  useEffect(() => {
    applyLayoutPrefs(prefs)
  }, [prefs])

  const update = (partial: Partial<LayoutPrefs>) => {
    const next = { ...prefs, ...partial }
    setPrefs(next)
    setDraftPreference('layout', next)
  }

  const isModified = JSON.stringify(prefs) !== JSON.stringify(DEFAULTS)

  const handleReset = () => {
    setPrefs({ ...DEFAULTS })
    setDraftPreference('layout', DEFAULTS)
  }

  return (
    <div className="unified-card card-padded preference-layout-section">
      <h2 className="title-sm">{t('section_title')}</h2>
      <p className="text-secondary">{t('section_description')}</p>

      <div className="layout-section__grid">
        <div className="layout-section__field">
          <label className="layout-section__label">{t('label_density')}</label>
          <div className="layout-section__radio-group">
            {DENSITY_OPTION_KEYS.map((opt) => (
              <button
                key={opt.value}
                className={`layout-section__radio-btn${prefs.density === opt.value ? ' layout-section__radio-btn--active' : ''}`}
                onClick={() => update({ density: opt.value })}
                type="button"
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="layout-section__field">
          <label className="layout-section__label">
            {t('label_border_radius')}
            <span className="layout-section__value">{prefs.radius ?? 8}px</span>
          </label>
          <input
            type="range"
            className="layout-section__slider"
            min={0}
            max={16}
            step={1}
            value={prefs.radius ?? 8}
            onChange={(e) => update({ radius: Number(e.target.value) })}
          />
          <div className="layout-section__range-labels">
            <span>0px</span>
            <span>16px</span>
          </div>
          <div className="layout-section__radius-preview">
            <div className="layout-section__radius-box" />
          </div>
        </div>

        <div className="layout-section__field">
          <label className="layout-section__label">{t('label_max_width')}</label>
          <select
            className="input"
            value={prefs.maxWidth || 'normal'}
            onChange={(e) => update({ maxWidth: e.target.value })}
          >
            {WIDTH_OPTION_KEYS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
            ))}
          </select>
        </div>

        <div className="layout-section__field">
          <label className="layout-section__label">
            {t('label_section_spacing')}
            <span className="layout-section__value">{prefs.sectionGap ?? 24}px</span>
          </label>
          <input
            type="range"
            className="layout-section__slider"
            min={8}
            max={32}
            step={2}
            value={prefs.sectionGap ?? 24}
            onChange={(e) => update({ sectionGap: Number(e.target.value) })}
          />
          <div className="layout-section__range-labels">
            <span>8px</span>
            <span>32px</span>
          </div>
        </div>
      </div>

      {isModified && (
        <div className="layout-section__actions">
          <button className="btn btn-secondary" onClick={handleReset} type="button">
            {t('btn_reset')}
          </button>
        </div>
      )}
    </div>
  )
}
