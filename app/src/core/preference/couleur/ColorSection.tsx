import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { applyCustomColors, clearCustomColors } from './applyCustomColors'
import { COLOR_GROUPS, LIGHT_DEFAULTS, DARK_DEFAULTS } from './colorDefaults'
import './couleur.scss'

export default function ColorSection() {
  const { getPreference, updatePreference } = useAuth()
  const currentTheme = getPreference('theme', 'light') as string
  const activeThemeKey = currentTheme === 'dark' ? 'dark' : 'light'

  const [editingTheme, setEditingTheme] = useState<'light' | 'dark'>(activeThemeKey)

  // Local state for fast preview — decoupled from AuthContext
  const [localColors, setLocalColors] = useState<Record<string, Record<string, string>>>(() => {
    const saved = getPreference('customColors', null)
    return saved && typeof saved === 'object' ? saved : {}
  })

  // Ref to access latest localColors in onBlur without stale closure
  const localColorsRef = useRef(localColors)
  localColorsRef.current = localColors

  // Sync from preferences if they change externally
  useEffect(() => {
    const saved = getPreference('customColors', null)
    if (saved && typeof saved === 'object') {
      setLocalColors(saved)
    }
  }, [])

  const defaults = editingTheme === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS

  const getCurrentValue = (varName: string): string => {
    return localColors?.[editingTheme]?.[varName] || defaults[varName] || '#000000'
  }

  const isModified = (varName: string): boolean => {
    return !!localColors?.[editingTheme]?.[varName]
  }

  const hasAnyModification = (): boolean => {
    const themeColors = localColors?.[editingTheme]
    return !!themeColors && Object.keys(themeColors).length > 0
  }

  const hasAnyModificationGlobal = (): boolean => {
    if (!localColors) return false
    return (
      (!!localColors.light && Object.keys(localColors.light).length > 0) ||
      (!!localColors.dark && Object.keys(localColors.dark).length > 0)
    )
  }

  // onChange: local state + DOM only (no AuthContext setState)
  const handleColorChange = (varName: string, value: string) => {
    const updated = { ...localColors }
    if (!updated[editingTheme]) updated[editingTheme] = {}
    updated[editingTheme] = { ...updated[editingTheme], [varName]: value }
    setLocalColors(updated)
    if (editingTheme === activeThemeKey) {
      applyCustomColors(updated, currentTheme)
    }
  }

  // onBlur: persist to AuthContext + API (once per interaction)
  const handleColorCommit = () => {
    updatePreference('customColors', localColorsRef.current)
  }

  const handleResetVar = (varName: string) => {
    const updated = { ...localColors }
    if (updated[editingTheme]) {
      const { [varName]: _, ...rest } = updated[editingTheme]
      if (Object.keys(rest).length === 0) {
        delete updated[editingTheme]
      } else {
        updated[editingTheme] = rest
      }
    }
    setLocalColors(updated)
    updatePreference('customColors', updated)
    if (editingTheme === activeThemeKey) {
      applyCustomColors(updated, currentTheme)
    }
  }

  const handleResetTheme = () => {
    const updated = { ...localColors }
    delete updated[editingTheme]
    setLocalColors(updated)
    updatePreference('customColors', updated)
    if (editingTheme === activeThemeKey) {
      applyCustomColors(updated, currentTheme)
    }
  }

  const handleResetAll = () => {
    setLocalColors({})
    updatePreference('customColors', {})
    clearCustomColors()
  }

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">Couleurs personnalisees</h2>
      <p className="text-secondary couleur-description">
        Personnalisez les couleurs de l'application pour chaque theme.
      </p>

      <div className="couleur-tabs">
        <button
          className={`couleur-tab ${editingTheme === 'light' ? 'couleur-tab--active' : ''}`}
          onClick={() => setEditingTheme('light')}
          type="button"
        >
          Theme clair
        </button>
        <button
          className={`couleur-tab ${editingTheme === 'dark' ? 'couleur-tab--active' : ''}`}
          onClick={() => setEditingTheme('dark')}
          type="button"
        >
          Theme sombre
        </button>
      </div>

      {COLOR_GROUPS.map((group) => (
        <div key={group.label} className="couleur-group">
          <h3 className="couleur-group__title">{group.label}</h3>
          <div className="couleur-grid">
            {group.vars.map(({ name, label }) => (
              <div key={name} className={`couleur-item${isModified(name) ? ' couleur-item--modified' : ''}`}>
                <label className="couleur-item__label">{label}</label>
                <div className="couleur-item__controls">
                  <input
                    type="color"
                    className="couleur-item__picker"
                    value={getCurrentValue(name)}
                    onChange={(e) => handleColorChange(name, e.target.value)}
                    onBlur={handleColorCommit}
                  />
                  <span className="couleur-item__hex">{getCurrentValue(name)}</span>
                  {isModified(name) && (
                    <button
                      className="couleur-item__reset"
                      onClick={() => handleResetVar(name)}
                      type="button"
                      title="Reinitialiser"
                    >
                      &#x21BA;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="couleur-actions">
        {hasAnyModification() && (
          <button className="btn btn-secondary" onClick={handleResetTheme} type="button">
            Reinitialiser {editingTheme === 'light' ? 'clair' : 'sombre'}
          </button>
        )}
        {hasAnyModificationGlobal() && (
          <button className="btn btn-secondary" onClick={handleResetAll} type="button">
            Tout reinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
