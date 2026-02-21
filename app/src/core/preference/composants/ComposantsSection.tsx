import { useState, useEffect } from 'react'
import { useDraftPreference } from '../DraftPreferenceContext'
import { applyComposantsPrefs, type ComposantsPrefs } from '../applyPreferences'
import './composants.scss'

const CARD_OPTIONS = [
  { value: 'flat', label: 'Plate' },
  { value: 'elevated', label: 'Elevee' },
  { value: 'bordered', label: 'Bordee' },
]

const MODAL_OPTIONS = [
  { value: 'none', label: 'Aucune' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide-up' },
  { value: 'scale', label: 'Scale' },
]

const BUTTON_OPTIONS = [
  { value: 'rounded', label: 'Arrondi' },
  { value: 'square', label: 'Carre' },
  { value: 'pill', label: 'Pill' },
]

const DEFAULTS: ComposantsPrefs = {
  cardStyle: 'elevated',
  stripedTables: true,
  modalAnimation: 'fade',
  buttonStyle: 'rounded',
  listSeparators: true,
}

export default function ComposantsSection() {
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
      <h2 className="title-sm">Style des composants</h2>
      <p className="text-secondary">Personnalisez l'apparence des elements d'interface.</p>

      <div className="composants-section__grid">
        <div className="composants-section__field">
          <label className="composants-section__label">Style des cards</label>
          <div className="composants-section__radio-group">
            {CARD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`composants-section__radio-btn${prefs.cardStyle === opt.value ? ' composants-section__radio-btn--active' : ''}`}
                onClick={() => update({ cardStyle: opt.value })}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="composants-section__field">
          <label className="composants-section__label">Style des boutons</label>
          <div className="composants-section__radio-group">
            {BUTTON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`composants-section__radio-btn${prefs.buttonStyle === opt.value ? ' composants-section__radio-btn--active' : ''}`}
                onClick={() => update({ buttonStyle: opt.value })}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="composants-section__field">
          <label className="composants-section__label">Animation des modals</label>
          <select
            className="input"
            value={prefs.modalAnimation || 'fade'}
            onChange={(e) => update({ modalAnimation: e.target.value })}
          >
            {MODAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="composants-section__field">
          <label className="composants-section__toggle-row">
            <span>Tables rayees</span>
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
            <span>Separateurs de liste</span>
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
          <span>Apercu card</span>
        </div>
        <button className="btn btn-primary composants-section__preview-btn" type="button">Apercu bouton</button>
      </div>

      {isModified && (
        <div className="composants-section__actions">
          <button className="btn btn-secondary" onClick={handleReset} type="button">
            Reinitialiser
          </button>
        </div>
      )}
    </div>
  )
}
