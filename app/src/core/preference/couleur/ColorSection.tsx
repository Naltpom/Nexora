import { useState, useCallback } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { applyCustomColors, clearCustomColors } from './applyCustomColors'
import { COLOR_GROUPS, LIGHT_DEFAULTS, DARK_DEFAULTS } from './colorDefaults'
import './couleur.scss'

export default function ColorSection() {
  const { getPreference, updatePreference } = useAuth()
  const currentTheme = getPreference('theme', 'light') as string

  const [editingTheme, setEditingTheme] = useState<'light' | 'dark'>(
    currentTheme === 'dark' ? 'dark' : 'light'
  )

  const customColors = getPreference('customColors', {}) as Record<string, Record<string, string>>
  const defaults = editingTheme === 'dark' ? DARK_DEFAULTS : LIGHT_DEFAULTS

  const getCurrentValue = (varName: string): string => {
    return customColors?.[editingTheme]?.[varName] || defaults[varName] || '#000000'
  }

  const isModified = (varName: string): boolean => {
    return !!customColors?.[editingTheme]?.[varName]
  }

  const hasAnyModification = (): boolean => {
    const themeColors = customColors?.[editingTheme]
    return !!themeColors && Object.keys(themeColors).length > 0
  }

  const hasAnyModificationGlobal = (): boolean => {
    if (!customColors) return false
    return (
      (!!customColors.light && Object.keys(customColors.light).length > 0) ||
      (!!customColors.dark && Object.keys(customColors.dark).length > 0)
    )
  }

  const isEditingActiveTheme = (): boolean => {
    return editingTheme === (currentTheme === 'dark' ? 'dark' : 'light')
  }

  const handleColorChange = useCallback((varName: string, value: string) => {
    const updated = { ...customColors }
    if (!updated[editingTheme]) updated[editingTheme] = {}
    updated[editingTheme] = { ...updated[editingTheme], [varName]: value }
    updatePreference('customColors', updated)
    if (isEditingActiveTheme()) {
      applyCustomColors(updated, currentTheme)
    }
  }, [customColors, editingTheme, currentTheme, updatePreference])

  const handleResetVar = useCallback((varName: string) => {
    const updated = { ...customColors }
    if (updated[editingTheme]) {
      const { [varName]: _, ...rest } = updated[editingTheme]
      if (Object.keys(rest).length === 0) {
        delete updated[editingTheme]
      } else {
        updated[editingTheme] = rest
      }
    }
    updatePreference('customColors', updated)
    if (isEditingActiveTheme()) {
      applyCustomColors(updated, currentTheme)
    }
  }, [customColors, editingTheme, currentTheme, updatePreference])

  const handleResetTheme = useCallback(() => {
    const updated = { ...customColors }
    delete updated[editingTheme]
    updatePreference('customColors', updated)
    if (isEditingActiveTheme()) {
      applyCustomColors(updated, currentTheme)
    }
  }, [customColors, editingTheme, currentTheme, updatePreference])

  const handleResetAll = useCallback(() => {
    updatePreference('customColors', {})
    clearCustomColors()
  }, [updatePreference])

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
