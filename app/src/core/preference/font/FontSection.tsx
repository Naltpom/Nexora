import { useState, useEffect } from 'react'
import { useDraftPreference } from '../DraftPreferenceContext'
import { applyFontPrefs, type FontPrefs } from '../applyPreferences'
import './font.scss'

const FONT_OPTIONS = [
  { value: 'system', label: 'Systeme' },
  { value: 'inter', label: 'Inter' },
  { value: 'roboto', label: 'Roboto' },
  { value: 'open-sans', label: 'Open Sans' },
  { value: 'atkinson', label: 'Atkinson Hyperlegible' },
  { value: 'opendyslexic', label: 'OpenDyslexic' },
]

const WEIGHT_OPTIONS = [
  { value: 300, label: 'Leger (300)' },
  { value: 400, label: 'Normal (400)' },
  { value: 500, label: 'Medium (500)' },
]

const DEFAULTS: FontPrefs = { family: 'system', scale: 100, lineHeight: 1.5, weight: 400 }

export default function FontSection() {
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
    applyFontPrefs(null)
  }

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">Typographie</h2>
      <p className="text-secondary">Personnalisez la police, la taille et l'interligne.</p>

      <div className="font-section__grid">
        <div className="font-section__field">
          <label className="font-section__label">Famille de police</label>
          <select
            className="input"
            value={prefs.family || 'system'}
            onChange={(e) => update({ family: e.target.value })}
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="font-section__field">
          <label className="font-section__label">
            Echelle de texte
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
            Interligne
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
          <label className="font-section__label">Epaisseur</label>
          <select
            className="input"
            value={prefs.weight || 400}
            onChange={(e) => update({ weight: Number(e.target.value) })}
          >
            {WEIGHT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="font-section__preview">
        <p className="font-section__preview-text">
          Apercu : Le vif renard brun saute par-dessus le chien paresseux. 0123456789
        </p>
      </div>

      {isModified && (
        <div className="font-section__actions">
          <button className="btn btn-secondary" onClick={handleReset} type="button">
            Reinitialiser
          </button>
        </div>
      )}
    </div>
  )
}
