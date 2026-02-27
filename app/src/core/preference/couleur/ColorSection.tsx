import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraftPreference } from '../DraftPreferenceContext'
import { applyCustomColors, clearCustomColors } from './applyCustomColors'
import { COLOR_GROUPS, LIGHT_DEFAULTS, DARK_DEFAULTS } from './colorDefaults'
import { COLOR_PRESETS, presetToColors } from './colorPresets'
import './couleur.scss'

export default function ColorSection() {
  const { t } = useTranslation('preference.couleur')
  const { getDraftPreference, setDraftPreference, resetVersion } = useDraftPreference()
  const currentTheme = getDraftPreference('theme', 'light') as string
  const activeThemeKey = currentTheme === 'dark' ? 'dark' : 'light'

  const [editingTheme, setEditingTheme] = useState<'light' | 'dark'>(activeThemeKey)
  const lastRandomRef = useRef<string | null>(null)

  // Local state for fast preview — decoupled from draft context
  const [localColors, setLocalColors] = useState<Record<string, Record<string, string>>>(() => {
    const saved = getDraftPreference('customColors', null)
    return saved && typeof saved === 'object' ? saved : {}
  })

  // Ref to access latest localColors in onBlur without stale closure
  const localColorsRef = useRef(localColors)
  localColorsRef.current = localColors

  // Re-sync when draft is discarded
  useEffect(() => {
    const saved = getDraftPreference('customColors', null)
    setLocalColors(saved && typeof saved === 'object' ? saved : {})
  }, [resetVersion])

  // -- Preset application ----------------------------------------------------

  const applyPreset = (presetKey: string) => {
    const preset = COLOR_PRESETS.find((p) => p.key === presetKey)
    if (!preset) return
    const updated: Record<string, Record<string, string>> = {
      light: presetToColors(preset.light),
      dark: presetToColors(preset.dark),
    }
    setLocalColors(updated)
    setDraftPreference('customColors', updated)
    applyCustomColors(updated, currentTheme)
    lastRandomRef.current = presetKey
  }

  const applyRandomPreset = () => {
    const candidates = COLOR_PRESETS.filter((p) => p.key !== lastRandomRef.current)
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    applyPreset(pick.key)
  }

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

  // onChange: local state + DOM only (no save)
  const handleColorChange = (varName: string, value: string) => {
    const updated = { ...localColors }
    if (!updated[editingTheme]) updated[editingTheme] = {}
    updated[editingTheme] = { ...updated[editingTheme], [varName]: value }
    setLocalColors(updated)
    if (editingTheme === activeThemeKey) {
      applyCustomColors(updated, currentTheme)
    }
  }

  // onBlur: persist to draft context
  const handleColorCommit = () => {
    setDraftPreference('customColors', localColorsRef.current)
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
    setDraftPreference('customColors', updated)
    if (editingTheme === activeThemeKey) {
      applyCustomColors(updated, currentTheme)
    }
  }

  const handleResetTheme = () => {
    const updated = { ...localColors }
    delete updated[editingTheme]
    setLocalColors(updated)
    setDraftPreference('customColors', updated)
    if (editingTheme === activeThemeKey) {
      applyCustomColors(updated, currentTheme)
    }
  }

  const handleResetAll = () => {
    setLocalColors({})
    setDraftPreference('customColors', {})
    clearCustomColors()
  }

  return (
    <div className="unified-card card-padded preference-couleur-section">
      <h2 className="title-sm">{t('section_title')}</h2>
      <p className="text-secondary couleur-description">
        {t('section_description')}
      </p>

      {/* Preset gallery */}
      <div className="couleur-presets-section">
        <h3 className="couleur-group__title">{t('presets_title')}</h3>
        <div className="couleur-presets">
          {COLOR_PRESETS.map((preset) => {
            const themeData = editingTheme === 'dark' ? preset.dark : preset.light
            const colors = presetToColors(themeData)
            return (
              <button
                key={preset.key}
                className="couleur-preset-card"
                type="button"
                onClick={() => applyPreset(preset.key)}
                title={t(preset.i18nKey)}
              >
                <div
                  className="couleur-preset-card__gradient"
                  style={{ '--preset-gradient': themeData.brand.gradient } as React.CSSProperties}
                />
                <span className="couleur-preset-card__label">{t(preset.i18nKey)}</span>
                <div className="couleur-preset-card__swatches">
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['primary'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['primary-light'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['primary-dark'] } as React.CSSProperties} />
                </div>
                <div className="couleur-preset-card__swatches">
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['success'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['warning'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['danger'] } as React.CSSProperties} />
                </div>
                <div className="couleur-preset-card__swatches">
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['gray-50'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['gray-300'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['gray-500'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['gray-700'] } as React.CSSProperties} />
                  <span className="couleur-preset-card__swatch" style={{ '--swatch-bg': colors['gray-900'] } as React.CSSProperties} />
                </div>
              </button>
            )
          })}
          <button
            className="couleur-preset-card couleur-preset-card--random"
            type="button"
            onClick={applyRandomPreset}
            title={t('preset_random_description')}
          >
            <div className="couleur-preset-card__random-icon">&#x1F3B2;</div>
            <span className="couleur-preset-card__label">{t('preset_random')}</span>
          </button>
        </div>
      </div>

      <div className="couleur-tabs">
        <button
          className={`couleur-tab ${editingTheme === 'light' ? 'couleur-tab--active' : ''}`}
          onClick={() => setEditingTheme('light')}
          type="button"
        >
          {t('tab_light')}
        </button>
        <button
          className={`couleur-tab ${editingTheme === 'dark' ? 'couleur-tab--active' : ''}`}
          onClick={() => setEditingTheme('dark')}
          type="button"
        >
          {t('tab_dark')}
        </button>
      </div>

      {COLOR_GROUPS.map((group) => (
        <div key={group.label} className="couleur-group">
          <h3 className="couleur-group__title">{t(group.i18nKey)}</h3>
          <div className="couleur-grid">
            {group.vars.map(({ name, i18nKey }) => (
              <div key={name} className={`couleur-item${isModified(name) ? ' couleur-item--modified' : ''}`}>
                <label className="couleur-item__label">{t(i18nKey)}</label>
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
                      title={t('btn_reset_var')}
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
            {editingTheme === 'light' ? t('btn_reset_theme_light') : t('btn_reset_theme_dark')}
          </button>
        )}
        {hasAnyModificationGlobal() && (
          <button className="btn btn-secondary" onClick={handleResetAll} type="button">
            {t('btn_reset_all')}
          </button>
        )}
      </div>
    </div>
  )
}
