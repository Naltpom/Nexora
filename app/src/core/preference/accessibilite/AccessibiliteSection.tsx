import { useState, useEffect } from 'react'
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

const TOGGLES: { key: keyof AccessibilitePrefs; label: string; desc: string }[] = [
  { key: 'highContrast', label: 'Contraste eleve', desc: 'Force les couleurs a un ratio 7:1 minimum (WCAG AAA)' },
  { key: 'reduceMotion', label: 'Reduire les animations', desc: 'Desactive les transitions et animations CSS' },
  { key: 'dyslexia', label: 'Police dyslexie', desc: 'Utilise la police OpenDyslexic pour une meilleure lisibilite' },
  { key: 'focusVisible', label: 'Focus renforce', desc: 'Outline epais sur les elements focusables au clavier' },
  { key: 'underlineLinks', label: 'Liens soulignes', desc: 'Souligne tous les liens, pas seulement au survol' },
  { key: 'largeTargets', label: 'Grandes zones tactiles', desc: 'Minimum 44x44px sur les boutons et liens (WCAG 2.5.5)' },
]

export default function AccessibiliteSection() {
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

  const activeCount = TOGGLES.filter((t) => prefs[t.key]).length

  const isModified = activeCount > 0

  const handleReset = () => {
    setPrefs({ ...DEFAULTS })
    setDraftPreference('accessibilite', DEFAULTS)
    applyAccessibilitePrefs(null)
  }

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">Accessibilite</h2>
      <p className="text-secondary">
        Adaptez l'interface a vos besoins.
        {activeCount > 0 && (
          <span className="a11y-section__active-count">{activeCount} actif{activeCount > 1 ? 's' : ''}</span>
        )}
      </p>

      <div className="a11y-section__list">
        {TOGGLES.map((toggle) => (
          <label key={toggle.key} className="a11y-section__item">
            <div className="a11y-section__item-text">
              <span className="a11y-section__item-label">{toggle.label}</span>
              <span className="a11y-section__item-desc">{toggle.desc}</span>
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
            Tout desactiver
          </button>
        </div>
      )}
    </div>
  )
}
