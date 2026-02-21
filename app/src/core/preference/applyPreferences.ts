/**
 * Apply font/layout/composants/accessibilite preferences as CSS variables + attributes.
 * Called from main.tsx IIFE (pre-render) and from each section on change.
 */

// ── Font ──

const FONT_FAMILIES: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", sans-serif',
  roboto: '"Roboto", sans-serif',
  'open-sans': '"Open Sans", sans-serif',
  atkinson: '"Atkinson Hyperlegible", sans-serif',
  opendyslexic: '"OpenDyslexic", sans-serif',
}

export interface FontPrefs {
  family?: string
  scale?: number // percentage: 85-125, default 100
  lineHeight?: number
  weight?: number
}

export function applyFontPrefs(prefs: FontPrefs | null | undefined): void {
  const el = document.documentElement.style
  if (!prefs) {
    el.removeProperty('--font-family')
    el.removeProperty('--line-height')
    el.removeProperty('--font-weight')
    document.documentElement.style.fontSize = ''
    return
  }
  if (prefs.family && prefs.family !== 'system') {
    el.setProperty('--font-family', FONT_FAMILIES[prefs.family] || FONT_FAMILIES.system)
  } else {
    el.removeProperty('--font-family')
  }
  // Scale: apply as html font-size %, all rem-based sizes scale proportionally
  if (prefs.scale && prefs.scale !== 100) {
    document.documentElement.style.fontSize = `${prefs.scale}%`
  } else {
    document.documentElement.style.fontSize = ''
  }
  if (prefs.lineHeight && prefs.lineHeight !== 1.5) {
    el.setProperty('--line-height', String(prefs.lineHeight))
  } else {
    el.removeProperty('--line-height')
  }
  if (prefs.weight && prefs.weight !== 400) {
    el.setProperty('--font-weight', String(prefs.weight))
  } else {
    el.removeProperty('--font-weight')
  }
}

// ── Layout ──

const DENSITY_MAP: Record<string, {
  padding: string; gap: string; rowHeight: string
  cardPadding: string; btnPadding: string; inputPadding: string
}> = {
  compact: { padding: '8px 12px', gap: '8px', rowHeight: '36px', cardPadding: '16px', btnPadding: '6px 12px', inputPadding: '6px 10px' },
  normal: { padding: '12px 16px', gap: '12px', rowHeight: '44px', cardPadding: '24px', btnPadding: '8px 16px', inputPadding: '8px 12px' },
  airy: { padding: '16px 20px', gap: '16px', rowHeight: '52px', cardPadding: '28px', btnPadding: '10px 20px', inputPadding: '12px 16px' },
}

export interface LayoutPrefs {
  density?: string
  radius?: number
  maxWidth?: string
  sectionGap?: number
}

export function applyLayoutPrefs(prefs: LayoutPrefs | null | undefined): void {
  const el = document.documentElement.style
  if (!prefs) {
    el.removeProperty('--density-padding')
    el.removeProperty('--density-gap')
    el.removeProperty('--density-row-height')
    el.removeProperty('--radius')
    el.removeProperty('--content-max-width')
    el.removeProperty('--section-gap')
    return
  }
  const density = DENSITY_MAP[prefs.density || 'normal']
  if (prefs.density && prefs.density !== 'normal') {
    el.setProperty('--density-padding', density.padding)
    el.setProperty('--density-gap', density.gap)
    el.setProperty('--density-row-height', density.rowHeight)
    el.setProperty('--density-card-padding', density.cardPadding)
    el.setProperty('--density-btn-padding', density.btnPadding)
    el.setProperty('--density-input-padding', density.inputPadding)
  } else {
    el.removeProperty('--density-padding')
    el.removeProperty('--density-gap')
    el.removeProperty('--density-row-height')
    el.removeProperty('--density-card-padding')
    el.removeProperty('--density-btn-padding')
    el.removeProperty('--density-input-padding')
  }
  if (prefs.radius !== undefined && prefs.radius !== 8) {
    el.setProperty('--radius', `${prefs.radius}px`)
  } else {
    el.removeProperty('--radius')
  }
  if (prefs.maxWidth && prefs.maxWidth !== 'normal') {
    const widths: Record<string, string> = { narrow: '720px', normal: '960px', wide: '1200px', full: '100%' }
    el.setProperty('--content-max-width', widths[prefs.maxWidth] || '960px')
  } else {
    el.removeProperty('--content-max-width')
  }
  if (prefs.sectionGap && prefs.sectionGap !== 16) {
    el.setProperty('--section-gap', `${prefs.sectionGap}px`)
  } else {
    el.removeProperty('--section-gap')
  }
}

// ── Composants ──

export interface ComposantsPrefs {
  cardStyle?: string
  stripedTables?: boolean
  modalAnimation?: string
  buttonStyle?: string
  listSeparators?: boolean
}

export function applyComposantsPrefs(prefs: ComposantsPrefs | null | undefined): void {
  const el = document.documentElement
  if (!prefs) {
    el.removeAttribute('data-card-style')
    el.removeAttribute('data-btn-style')
    el.removeAttribute('data-modal-anim')
    el.classList.remove('no-table-stripes', 'no-list-separators')
    return
  }
  if (prefs.cardStyle && prefs.cardStyle !== 'elevated') {
    el.setAttribute('data-card-style', prefs.cardStyle)
  } else {
    el.removeAttribute('data-card-style')
  }
  if (prefs.buttonStyle && prefs.buttonStyle !== 'rounded') {
    el.setAttribute('data-btn-style', prefs.buttonStyle)
  } else {
    el.removeAttribute('data-btn-style')
  }
  if (prefs.modalAnimation && prefs.modalAnimation !== 'fade') {
    el.setAttribute('data-modal-anim', prefs.modalAnimation)
  } else {
    el.removeAttribute('data-modal-anim')
  }
  if (prefs.stripedTables === false) {
    el.classList.add('no-table-stripes')
  } else {
    el.classList.remove('no-table-stripes')
  }
  if (prefs.listSeparators === false) {
    el.classList.add('no-list-separators')
  } else {
    el.classList.remove('no-list-separators')
  }
}

// ── Accessibilite ──

export interface AccessibilitePrefs {
  highContrast?: boolean
  reduceMotion?: boolean
  dyslexia?: boolean
  focusVisible?: boolean
  underlineLinks?: boolean
  largeTargets?: boolean
}

export function applyAccessibilitePrefs(prefs: AccessibilitePrefs | null | undefined): void {
  const el = document.documentElement
  const toggle = (cls: string, on: boolean) => on ? el.classList.add(cls) : el.classList.remove(cls)

  if (!prefs) {
    el.classList.remove('a11y-high-contrast', 'a11y-reduce-motion', 'a11y-dyslexia', 'a11y-focus-visible', 'a11y-underline-links', 'a11y-large-targets')
    return
  }
  toggle('a11y-high-contrast', !!prefs.highContrast)
  toggle('a11y-reduce-motion', !!prefs.reduceMotion)
  toggle('a11y-dyslexia', !!prefs.dyslexia)
  toggle('a11y-focus-visible', !!prefs.focusVisible)
  toggle('a11y-underline-links', !!prefs.underlineLinks)
  toggle('a11y-large-targets', !!prefs.largeTargets)
}

// ── Apply all from prefs object (used by main.tsx IIFE) ──

export function applyAllPreferences(prefs: Record<string, any>): void {
  applyFontPrefs(prefs.font)
  applyLayoutPrefs(prefs.layout)
  applyComposantsPrefs(prefs.composants)
  applyAccessibilitePrefs(prefs.accessibilite)
}
