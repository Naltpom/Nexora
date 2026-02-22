import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useAuth } from '../AuthContext'
import { applyFontPrefs, applyLayoutPrefs, applyComposantsPrefs, applyAccessibilitePrefs } from './applyPreferences'
import { applyCustomColors } from './couleur/applyCustomColors'

const PREFERENCE_KEYS = ['theme', 'customColors', 'font', 'layout', 'composants', 'accessibilite'] as const

export interface PreferenceChange {
  key: string
  label: string
  oldDisplay: string
  newDisplay: string
}

interface DraftPreferenceContextType {
  getDraftPreference: (key: string, defaultValue?: any) => any
  setDraftPreference: (key: string, value: any) => void
  hasChanges: boolean
  getChanges: () => PreferenceChange[]
  saveAll: () => Promise<void>
  discardAll: () => void
  resetVersion: number
}

const DraftPreferenceContext = createContext<DraftPreferenceContextType | null>(null)

export function useDraftPreference() {
  const ctx = useContext(DraftPreferenceContext)
  if (!ctx) throw new Error('useDraftPreference must be used within DraftPreferenceProvider')
  return ctx
}

// ── i18n key maps for human-readable change display ──

const PREF_LABEL_KEYS: Record<string, string> = {
  theme: 'pref_label_theme',
  customColors: 'pref_label_custom_colors',
  font: 'pref_label_font',
  layout: 'pref_label_layout',
  composants: 'pref_label_composants',
  accessibilite: 'pref_label_accessibilite',
}

const FONT_LABEL_KEYS: Record<string, string | null> = {
  system: 'font_label_system', inter: null, roboto: null,
  'open-sans': null, atkinson: null, opendyslexic: null,
}

const FONT_DISPLAY_NAMES: Record<string, string> = {
  inter: 'Inter', roboto: 'Roboto',
  'open-sans': 'Open Sans', atkinson: 'Atkinson Hyperlegible', opendyslexic: 'OpenDyslexic',
}

const DENSITY_LABEL_KEYS: Record<string, string> = {
  compact: 'density_label_compact', normal: 'density_label_normal', airy: 'density_label_airy',
}

const WIDTH_LABEL_KEYS: Record<string, string> = {
  narrow: 'width_label_narrow', normal: 'width_label_normal', wide: 'width_label_wide', full: 'width_label_full',
}

const A11Y_LABEL_KEYS: { key: string; i18nKey: string }[] = [
  { key: 'highContrast', i18nKey: 'a11y_label_high_contrast' },
  { key: 'reduceMotion', i18nKey: 'a11y_label_reduce_motion' },
  { key: 'dyslexia', i18nKey: 'a11y_label_dyslexia' },
  { key: 'focusVisible', i18nKey: 'a11y_label_focus_visible' },
  { key: 'underlineLinks', i18nKey: 'a11y_label_underline_links' },
  { key: 'largeTargets', i18nKey: 'a11y_label_large_targets' },
]

function formatValue(t: TFunction, key: string, val: any): string {
  if (val === null || val === undefined) return t('format_default')

  switch (key) {
    case 'theme':
      return val === 'dark' ? t('format_theme_dark') : t('format_theme_light')

    case 'customColors': {
      if (!val || typeof val !== 'object') return t('format_default')
      const parts: string[] = []
      if (val.light && Object.keys(val.light).length > 0)
        parts.push(`${Object.keys(val.light).length} ${t('format_custom_light')}`)
      if (val.dark && Object.keys(val.dark).length > 0)
        parts.push(`${Object.keys(val.dark).length} ${t('format_custom_dark')}`)
      return parts.length > 0 ? parts.join(', ') + ' ' + t('format_custom_suffix') : t('format_default')
    }

    case 'font': {
      if (!val || typeof val !== 'object') return t('format_default')
      const parts: string[] = []
      if (val.family && val.family !== 'system') {
        const fKey = FONT_LABEL_KEYS[val.family]
        parts.push(fKey ? t(fKey) : (FONT_DISPLAY_NAMES[val.family] || val.family))
      }
      if (val.scale && val.scale !== 100) parts.push(`${val.scale}%`)
      if (val.lineHeight && val.lineHeight !== 1.5) parts.push(`${t('format_line_height')} ${val.lineHeight}`)
      if (val.weight && val.weight !== 400) parts.push(`${t('format_weight')} ${val.weight}`)
      return parts.length > 0 ? parts.join(', ') : t('format_default')
    }

    case 'layout': {
      if (!val || typeof val !== 'object') return t('format_default')
      const parts: string[] = []
      if (val.density && val.density !== 'normal') {
        const dKey = DENSITY_LABEL_KEYS[val.density]
        parts.push(dKey ? t(dKey) : val.density)
      }
      if (val.radius !== undefined && val.radius !== 8) parts.push(`${t('format_radius')} ${val.radius}px`)
      if (val.maxWidth && val.maxWidth !== 'normal') {
        const wKey = WIDTH_LABEL_KEYS[val.maxWidth]
        parts.push(wKey ? t(wKey) : val.maxWidth)
      }
      if (val.sectionGap && val.sectionGap !== 16) parts.push(`${t('format_spacing')} ${val.sectionGap}px`)
      return parts.length > 0 ? parts.join(', ') : t('format_default')
    }

    case 'composants': {
      if (!val || typeof val !== 'object') return t('format_default')
      const parts: string[] = []
      if (val.cardStyle && val.cardStyle !== 'elevated') parts.push(`${t('format_cards')} ${val.cardStyle}`)
      if (val.buttonStyle && val.buttonStyle !== 'rounded') parts.push(`${t('format_buttons')} ${val.buttonStyle}`)
      if (val.modalAnimation && val.modalAnimation !== 'fade') parts.push(`${t('format_modal')} ${val.modalAnimation}`)
      if (val.stripedTables === false) parts.push(t('format_no_stripes'))
      if (val.listSeparators === false) parts.push(t('format_no_separators'))
      return parts.length > 0 ? parts.join(', ') : t('format_default')
    }

    case 'accessibilite': {
      if (!val || typeof val !== 'object') return t('format_none')
      const active = A11Y_LABEL_KEYS.filter(({ key: k }) => val[k]).map(({ i18nKey }) => t(i18nKey))
      return active.length > 0 ? active.join(', ') : t('format_none')
    }

    default:
      return String(val)
  }
}

// ── Apply visual preview for a single key ──

function applyVisual(key: string, value: any, draft: Record<string, any>) {
  switch (key) {
    case 'theme':
      document.documentElement.setAttribute('data-theme', value || 'light')
      applyCustomColors(draft.customColors, value || 'light')
      break
    case 'customColors':
      applyCustomColors(value, draft.theme || 'light')
      break
    case 'font':
      applyFontPrefs(value)
      break
    case 'layout':
      applyLayoutPrefs(value)
      break
    case 'composants':
      applyComposantsPrefs(value)
      break
    case 'accessibilite':
      applyAccessibilitePrefs(value)
      break
  }
}

function revertAllVisuals(snapshot: Record<string, any>) {
  document.documentElement.setAttribute('data-theme', snapshot.theme || 'light')
  applyCustomColors(snapshot.customColors, snapshot.theme || 'light')
  applyFontPrefs(snapshot.font)
  applyLayoutPrefs(snapshot.layout)
  applyComposantsPrefs(snapshot.composants)
  applyAccessibilitePrefs(snapshot.accessibilite)
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function DraftPreferenceProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('preference')
  const { getPreference, updatePreference } = useAuth()

  const buildSnapshot = () => {
    const snap: Record<string, any> = {}
    for (const key of PREFERENCE_KEYS) {
      snap[key] = getPreference(key, null)
    }
    return snap
  }

  const [snapshot, setSnapshot] = useState(() => buildSnapshot())
  const [draft, setDraft] = useState(() => deepClone(snapshot))
  const [resetVersion, setResetVersion] = useState(0)
  const hasChangesRef = useRef(false)

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(snapshot)
  hasChangesRef.current = hasChanges

  const getDraftPreference = useCallback((key: string, defaultValue: any = null) => {
    return draft[key] !== undefined && draft[key] !== null ? draft[key] : defaultValue
  }, [draft])

  const setDraftPreference = useCallback((key: string, value: any) => {
    setDraft(prev => {
      const next = { ...prev, [key]: value }
      applyVisual(key, value, next)
      return next
    })
  }, [])

  const getChanges = useCallback((): PreferenceChange[] => {
    const changes: PreferenceChange[] = []
    for (const key of PREFERENCE_KEYS) {
      if (JSON.stringify(draft[key]) !== JSON.stringify(snapshot[key])) {
        const labelKey = PREF_LABEL_KEYS[key]
        changes.push({
          key,
          label: labelKey ? t(labelKey) : key,
          oldDisplay: formatValue(t, key, snapshot[key]),
          newDisplay: formatValue(t, key, draft[key]),
        })
      }
    }
    return changes
  }, [draft, snapshot, t])

  const saveAll = useCallback(async () => {
    for (const key of PREFERENCE_KEYS) {
      if (JSON.stringify(draft[key]) !== JSON.stringify(snapshot[key])) {
        await updatePreference(key, draft[key])
      }
    }
    setSnapshot(deepClone(draft))
  }, [draft, snapshot, updatePreference])

  const discardAll = useCallback(() => {
    const snapshotCopy = deepClone(snapshot)
    setDraft(snapshotCopy)
    revertAllVisuals(snapshot)
    setResetVersion(v => v + 1)
  }, [snapshot])

  // Cleanup: revert on unmount if unsaved
  useEffect(() => {
    return () => {
      if (hasChangesRef.current) {
        revertAllVisuals(snapshot)
      }
    }
  }, [snapshot])

  return (
    <DraftPreferenceContext.Provider value={{
      getDraftPreference,
      setDraftPreference,
      hasChanges,
      getChanges,
      saveAll,
      discardAll,
      resetVersion,
    }}>
      {children}
    </DraftPreferenceContext.Provider>
  )
}
