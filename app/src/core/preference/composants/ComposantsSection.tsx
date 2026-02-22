import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraftPreference } from '../DraftPreferenceContext'
import { applyComposantsPrefs, type ComposantsPrefs } from '../applyPreferences'
import './composants.scss'

const CARD_OPTION_KEYS = [
  { value: 'flat', key: 'card_flat' },
  { value: 'elevated', key: 'card_elevated' },
  { value: 'bordered', key: 'card_bordered' },
]

const MODAL_OPTION_KEYS = [
  { value: 'none', key: 'modal_none' },
  { value: 'fade', key: 'modal_fade' },
  { value: 'slide', key: 'modal_slide' },
  { value: 'scale', key: 'modal_scale' },
]

const BUTTON_OPTION_KEYS = [
  { value: 'rounded', key: 'button_rounded' },
  { value: 'square', key: 'button_square' },
  { value: 'pill', key: 'button_pill' },
]

const DEFAULTS: ComposantsPrefs = {
  cardStyle: 'elevated',
  stripedTables: true,
  modalAnimation: 'fade',
  buttonStyle: 'rounded',
  listSeparators: true,
}

export default function ComposantsSection() {
  const { t } = useTranslation('preference.composants')
  const { getDraftPreference, setDraftPreference, resetVersion } = useDraftPreference()

  const [prefs, setPrefs] = useState<ComposantsPrefs>(() => {
    const saved = getDraftPreference('composants', null)
    return saved && typeof saved === 'object' ? saved : { ...DEFAULTS }
  })

  // Re-sync when draft is discarded
  useEffect(() => {
    const saved = getDraftPreference('composants', null)
    setPrefs(saved && typeof saved === 'object' ? saved : { ...DEFAULTS })
  }, [resetVersion])

  useEffect(() => {
    applyComposantsPrefs(prefs)
  }, [prefs])

  const update = (partial: Partial<ComposantsPrefs>) => {
    const next = { ...prefs, ...partial }
    setPrefs(next)
    setDraftPreference('composants', next)
  }

  const isModified = JSON.stringify(prefs) !== JSON.stringify(DEFAULTS)

  const handleReset = () => {
    setPrefs({ ...DEFAULTS })
    setDraftPreference('composants', DEFAULTS)
    applyComposantsPrefs(null)
  }

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">{t('section_title')}</h2>
      <p className="text-secondary">{t('section_description')}</p>

      <div className="composants-section__grid">
        <div className="composants-section__field">
          <label className="composants-section__label">{t('label_card_style')}</label>
          <div className="composants-section__radio-group">
            {CARD_OPTION_KEYS.map((opt) => (
              <button
                key={opt.value}
                className={`composants-section__radio-btn${prefs.cardStyle === opt.value ? ' composants-section__radio-btn--active' : ''}`}
                onClick={() => update({ cardStyle: opt.value })}
                type="button"
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="composants-section__field">
          <label className="composants-section__label">{t('label_button_style')}</label>
          <div className="composants-section__radio-group">
            {BUTTON_OPTION_KEYS.map((opt) => (
              <button
                key={opt.value}
                className={`composants-section__radio-btn${prefs.buttonStyle === opt.value ? ' composants-section__radio-btn--active' : ''}`}
                onClick={() => update({ buttonStyle: opt.value })}
                type="button"
              >
                {t(opt.key)}
              </button>
            ))}
          </div>
        </div>

        <div className="composants-section__field">
          <label className="composants-section__label">{t('label_modal_animation')}</label>
          <select
            className="input"
            value={prefs.modalAnimation || 'fade'}
            onChange={(e) => update({ modalAnimation: e.target.value })}
          >
            {MODAL_OPTION_KEYS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
            ))}
          </select>
        </div>

        <div className="composants-section__field">
          <label className="composants-section__toggle-row">
            <span>{t('label_striped_tables')}</span>
            <input
              type="checkbox"
              className="toggle"
              checked={prefs.stripedTables !== false}
              onChange={(e) => update({ stripedTables: e.target.checked })}
            />
          </label>
        </div>

        <div className="composants-section__field">
          <label className="composants-section__toggle-row">
            <span>{t('label_list_separators')}</span>
            <input
              type="checkbox"
              className="toggle"
              checked={prefs.listSeparators !== false}
              onChange={(e) => update({ listSeparators: e.target.checked })}
            />
          </label>
        </div>
      </div>

      <div className="composants-section__preview">
        <div className="composants-section__preview-card">
          <span>{t('preview_card')}</span>
        </div>
        <button className="btn btn-primary composants-section__preview-btn" type="button">{t('preview_button')}</button>
      </div>

      {isModified && (
        <div className="composants-section__actions">
          <button className="btn btn-secondary" onClick={handleReset} type="button">
            {t('btn_reset')}
          </button>
        </div>
      )}
    </div>
  )
}
