import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '../AuthContext'
import { applyFontPrefs, applyLayoutPrefs, applyComposantsPrefs, applyAccessibilitePrefs } from './applyPreferences'
import { applyCustomColors, clearCustomColors } from './couleur/applyCustomColors'

const PREFERENCE_KEYS = ['theme', 'customColors', 'font', 'layout', 'composants', 'accessibilite'] as const
type PrefKey = typeof PREFERENCE_KEYS[number]

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

// ── Label maps for human-readable change display ──

const PREF_LABELS: Record<string, string> = {
  theme: 'Theme',
  customColors: 'Couleurs personnalisees',
  font: 'Typographie',
  layout: 'Mise en page',
  composants: 'Style des composants',
  accessibilite: 'Accessibilite',
}

const FONT_LABELS: Record<string, string> = {
  system: 'Systeme', inter: 'Inter', roboto: 'Roboto',
  'open-sans': 'Open Sans', atkinson: 'Atkinson Hyperlegible', opendyslexic: 'OpenDyslexic',
}

const DENSITY_LABELS: Record<string, string> = { compact: 'Compact', normal: 'Normal', airy: 'Aere' }

const WIDTH_LABELS: Record<string, string> = {
  narrow: 'Etroit (720px)', normal: 'Normal (960px)', wide: 'Large (1200px)', full: 'Pleine largeur',
}

const A11Y_LABELS: { key: string; label: string }[] = [
  { key: 'highContrast', label: 'Contraste eleve' },
  { key: 'reduceMotion', label: 'Reduire animations' },
  { key: 'dyslexia', label: 'Police dyslexie' },
  { key: 'focusVisible', label: 'Focus renforce' },
  { key: 'underlineLinks', label: 'Liens soulignes' },
  { key: 'largeTargets', label: 'Grandes zones tactiles' },
]

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined) return 'Par defaut'

  switch (key) {
    case 'theme':
      return val === 'dark' ? 'Sombre' : 'Clair'

    case 'customColors': {
      if (!val || typeof val !== 'object') return 'Par defaut'
      const parts: string[] = []
      if (val.light && Object.keys(val.light).length > 0)
        parts.push(`${Object.keys(val.light).length} clair`)
      if (val.dark && Object.keys(val.dark).length > 0)
        parts.push(`${Object.keys(val.dark).length} sombre`)
      return parts.length > 0 ? parts.join(', ') + ' personnalisee(s)' : 'Par defaut'
    }

    case 'font': {
      if (!val || typeof val !== 'object') return 'Par defaut'
      const parts: string[] = []
      if (val.family && val.family !== 'system') parts.push(FONT_LABELS[val.family] || val.family)
      if (val.scale && val.scale !== 100) parts.push(`${val.scale}%`)
      if (val.lineHeight && val.lineHeight !== 1.5) parts.push(`interligne ${val.lineHeight}`)
      if (val.weight && val.weight !== 400) parts.push(`epaisseur ${val.weight}`)
      return parts.length > 0 ? parts.join(', ') : 'Par defaut'
    }

    case 'layout': {
      if (!val || typeof val !== 'object') return 'Par defaut'
      const parts: string[] = []
      if (val.density && val.density !== 'normal') parts.push(DENSITY_LABELS[val.density] || val.density)
      if (val.radius !== undefined && val.radius !== 8) parts.push(`rayon ${val.radius}px`)
      if (val.maxWidth && val.maxWidth !== 'normal') parts.push(WIDTH_LABELS[val.maxWidth] || val.maxWidth)
      if (val.sectionGap && val.sectionGap !== 16) parts.push(`espacement ${val.sectionGap}px`)
      return parts.length > 0 ? parts.join(', ') : 'Par defaut'
    }

    case 'composants': {
      if (!val || typeof val !== 'object') return 'Par defaut'
      const parts: string[] = []
      if (val.cardStyle && val.cardStyle !== 'elevated') parts.push(`cards ${val.cardStyle}`)
      if (val.buttonStyle && val.buttonStyle !== 'rounded') parts.push(`boutons ${val.buttonStyle}`)
      if (val.modalAnimation && val.modalAnimation !== 'fade') parts.push(`modal ${val.modalAnimation}`)
      if (val.stripedTables === false) parts.push('sans rayures')
      if (val.listSeparators === false) parts.push('sans separateurs')
      return parts.length > 0 ? parts.join(', ') : 'Par defaut'
    }

    case 'accessibilite': {
      if (!val || typeof val !== 'object') return 'Aucun'
      const active = A11Y_LABELS.filter(({ key: k }) => val[k]).map(({ label }) => label)
      return active.length > 0 ? active.join(', ') : 'Aucun'
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
        changes.push({
          key,
          label: PREF_LABELS[key] || key,
          oldDisplay: formatValue(key, snapshot[key]),
          newDisplay: formatValue(key, draft[key]),
        })
      }
    }
    return changes
  }, [draft, snapshot])

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
