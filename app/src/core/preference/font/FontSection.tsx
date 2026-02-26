import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraftPreference } from '../DraftPreferenceContext'
import { applyFontPrefs, type FontPrefs } from '../applyPreferences'
import './font.scss'

const FONT_OPTION_KEYS = [
  { value: 'system', key: 'font_system' },
  { value: 'inter', key: 'font_inter' },
  { value: 'roboto', key: 'font_roboto' },
  { value: 'open-sans', key: 'font_open_sans' },
  { value: 'atkinson', key: 'font_atkinson' },
  { value: 'opendyslexic', key: 'font_opendyslexic' },
]

const WEIGHT_OPTION_KEYS = [
  { value: 300, key: 'weight_light' },
  { value: 400, key: 'weight_normal' },
  { value: 500, key: 'weight_medium' },
]

const DEFAULTS: FontPrefs = { family: 'system', scale: 100, lineHeight: 1.5, weight: 400 }

export default function FontSection() {
  const { t } = useTranslation('preference.font')
  const { getDraftPreference, setDraftPreference, resetVersion } = useDraftPreference()

  const [prefs, setPrefs] = useState<FontPrefs>(() => {
    const saved = getDraftPreference('font', null)
    return saved && typeof saved === 'object' ? saved : { ...DEFAULTS }
  })

  // Re-sync when draft is discarded
  useEffect(() => {
    const saved = getDraftPreference('font', null)
    setPrefs(saved && typeof saved === 'object' ? saved : { ...DEFAULTS })
  }, [resetVersion])

  useEffect(() => {
    applyFontPrefs(prefs)
  }, [prefs])

  const update = (partial: Partial<FontPrefs>) => {
    const next = { ...prefs, ...partial }
    setPrefs(next)
    setDraftPreference('font', next)
  }

  const isModified = JSON.stringify(prefs) !== JSON.stringify(DEFAULTS)

  const handleReset = () => {
    setPrefs({ ...DEFAULTS })
    setDraftPreference('font', DEFAULTS)
  }

  return (
    <div className="unified-card card-padded preference-font-section">
      <h2 className="title-sm">{t('section_title')}</h2>
      <p className="text-secondary">{t('section_description')}</p>

      <div className="font-section__grid">
        <div className="font-section__field">
          <label className="font-section__label">{t('label_font_family')}</label>
          <select
            className="input"
            value={prefs.family || 'system'}
            onChange={(e) => update({ family: e.target.value })}
          >
            {FONT_OPTION_KEYS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
            ))}
          </select>
        </div>

        <div className="font-section__field">
          <label className="font-section__label">
            {t('label_text_scale')}
            <span className="font-section__value">{prefs.scale || 100}%</span>
          </label>
          <input
            type="range"
            className="font-section__slider"
            min={85}
            max={125}
            step={5}
            value={prefs.scale || 100}
            onChange={(e) => update({ scale: Number(e.target.value) })}
          />
          <div className="font-section__range-labels">
            <span>85%</span>
            <span>125%</span>
          </div>
        </div>

        <div className="font-section__field">
          <label className="font-section__label">
            {t('label_line_height')}
            <span className="font-section__value">{prefs.lineHeight || 1.5}</span>
          </label>
          <input
            type="range"
            className="font-section__slider"
            min={1.2}
            max={2.0}
            step={0.1}
            value={prefs.lineHeight || 1.5}
            onChange={(e) => update({ lineHeight: Number(e.target.value) })}
          />
          <div className="font-section__range-labels">
            <span>1.2</span>
            <span>2.0</span>
          </div>
        </div>

        <div className="font-section__field">
          <label className="font-section__label">{t('label_weight')}</label>
          <select
            className="input"
            value={prefs.weight || 400}
            onChange={(e) => update({ weight: Number(e.target.value) })}
          >
            {WEIGHT_OPTION_KEYS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="font-section__preview">
        <p className="font-section__preview-text">
          {t('preview_text')}
        </p>
      </div>

      {isModified && (
        <div className="font-section__actions">
          <button className="btn btn-secondary" onClick={handleReset} type="button">
            {t('btn_reset')}
          </button>
        </div>
      )}
    </div>
  )
}
