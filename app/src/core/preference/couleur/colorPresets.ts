// ---------------------------------------------------------------------------
// Color theme presets — maps rich palette definitions to the 16 CSS variables
// ---------------------------------------------------------------------------

export interface PresetThemeColors {
  bg: { primary: string; secondary: string; tertiary: string }
  text: { primary: string; secondary: string; muted: string }
  brand: {
    primary: string; primaryHover: string
    secondary: string; secondaryHover: string
    gradient: string
  }
  semantic: { success: string; warning: string; error: string; info: string }
  surface: {
    card: string; cardBorder: string
    input: string; inputBorder: string; inputFocus: string
  }
}

export interface ColorPreset {
  key: string
  i18nKey: string
  light: PresetThemeColors
  dark: PresetThemeColors
}

// -- Hex interpolation helper ------------------------------------------------

function interpolateHex(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16)
  const g1 = parseInt(c1.slice(3, 5), 16)
  const b1 = parseInt(c1.slice(5, 7), 16)
  const r2 = parseInt(c2.slice(1, 3), 16)
  const g2 = parseInt(c2.slice(3, 5), 16)
  const b2 = parseInt(c2.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// -- Mapping: preset theme → 16 CSS variables --------------------------------

export function presetToColors(theme: PresetThemeColors): Record<string, string> {
  return {
    'primary': theme.brand.primary,
    'primary-light': theme.brand.secondary,
    'primary-dark': theme.brand.primaryHover,
    'success': theme.semantic.success,
    'warning': theme.semantic.warning,
    'danger': theme.semantic.error,
    'gray-50': theme.bg.secondary,
    'gray-100': theme.bg.tertiary,
    'gray-200': theme.surface.cardBorder,
    'gray-300': theme.surface.inputBorder,
    'gray-400': theme.text.muted,
    'gray-500': interpolateHex(theme.text.muted, theme.text.secondary, 0.5),
    'gray-600': theme.text.secondary,
    'gray-700': interpolateHex(theme.text.secondary, theme.text.primary, 0.33),
    'gray-800': interpolateHex(theme.text.secondary, theme.text.primary, 0.67),
    'gray-900': theme.text.primary,
  }
}

// -- Preset definitions ------------------------------------------------------

export const COLOR_PRESETS: ColorPreset[] = [
  {
    key: 'teal',
    i18nKey: 'preset_teal',
    light: {
      bg: { primary: '#FFFFFF', secondary: '#F0FAF8', tertiary: '#E0F5F1' },
      text: { primary: '#0F2B26', secondary: '#3D6B63', muted: '#7DA39B' },
      brand: {
        primary: '#0D9488', primaryHover: '#0B7E74',
        secondary: '#06B6D4', secondaryHover: '#0598B0',
        gradient: 'linear-gradient(135deg, #0D9488, #06B6D4)',
      },
      semantic: { success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#06B6D4' },
      surface: {
        card: '#FFFFFF', cardBorder: '#D5EDE8',
        input: '#F0FAF8', inputBorder: '#B8DDD5', inputFocus: '#0D9488',
      },
    },
    dark: {
      bg: { primary: '#0B1210', secondary: '#0F1A17', tertiary: '#142220' },
      text: { primary: '#E0F5F1', secondary: '#8BBAB2', muted: '#4D7A72' },
      brand: {
        primary: '#14B8A6', primaryHover: '#2DD4BF',
        secondary: '#22D3EE', secondaryHover: '#67E8F9',
        gradient: 'linear-gradient(135deg, #14B8A6, #22D3EE)',
      },
      semantic: { success: '#34D399', warning: '#FBBF24', error: '#F87171', info: '#22D3EE' },
      surface: {
        card: '#0F1A17', cardBorder: '#1C3530',
        input: '#142220', inputBorder: '#1C3530', inputFocus: '#14B8A6',
      },
    },
  },
  {
    key: 'navy',
    i18nKey: 'preset_navy',
    light: {
      bg: { primary: '#FFFFFF', secondary: '#F4F6FA', tertiary: '#E8ECF4' },
      text: { primary: '#0F172A', secondary: '#334155', muted: '#94A3B8' },
      brand: {
        primary: '#1E3A5F', primaryHover: '#172E4D',
        secondary: '#F59E0B', secondaryHover: '#D97706',
        gradient: 'linear-gradient(135deg, #1E3A5F, #2D5A8E)',
      },
      semantic: { success: '#16A34A', warning: '#F59E0B', error: '#DC2626', info: '#3B82F6' },
      surface: {
        card: '#FFFFFF', cardBorder: '#DAE0EA',
        input: '#F4F6FA', inputBorder: '#CBD5E1', inputFocus: '#1E3A5F',
      },
    },
    dark: {
      bg: { primary: '#0C1222', secondary: '#111827', tertiary: '#1A2332' },
      text: { primary: '#E2E8F0', secondary: '#94A3B8', muted: '#475569' },
      brand: {
        primary: '#3B6EAE', primaryHover: '#4A82C8',
        secondary: '#FBBF24', secondaryHover: '#FCD34D',
        gradient: 'linear-gradient(135deg, #3B6EAE, #5B8ECE)',
      },
      semantic: { success: '#22C55E', warning: '#FBBF24', error: '#EF4444', info: '#60A5FA' },
      surface: {
        card: '#111827', cardBorder: '#1E2D42',
        input: '#1A2332', inputBorder: '#253448', inputFocus: '#3B6EAE',
      },
    },
  },
  {
    key: 'blue',
    i18nKey: 'preset_blue',
    light: {
      bg: { primary: '#FFFFFF', secondary: '#F5F7FF', tertiary: '#EBF0FF' },
      text: { primary: '#0F172A', secondary: '#3B4963', muted: '#8896AE' },
      brand: {
        primary: '#2563EB', primaryHover: '#1D4FD7',
        secondary: '#7C3AED', secondaryHover: '#6D28D9',
        gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',
      },
      semantic: { success: '#059669', warning: '#EAB308', error: '#E11D48', info: '#2563EB' },
      surface: {
        card: '#FFFFFF', cardBorder: '#DBEAFE',
        input: '#F5F7FF', inputBorder: '#C7D8F0', inputFocus: '#2563EB',
      },
    },
    dark: {
      bg: { primary: '#0A0F1E', secondary: '#111836', tertiary: '#161E3D' },
      text: { primary: '#E2E8F0', secondary: '#8896AE', muted: '#4A5578' },
      brand: {
        primary: '#3B82F6', primaryHover: '#60A5FA',
        secondary: '#8B5CF6', secondaryHover: '#A78BFA',
        gradient: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
      },
      semantic: { success: '#34D399', warning: '#FDE047', error: '#FB7185', info: '#60A5FA' },
      surface: {
        card: '#111836', cardBorder: '#1E2A4A',
        input: '#161E3D', inputBorder: '#1E2A4A', inputFocus: '#3B82F6',
      },
    },
  },
  {
    key: 'charcoal',
    i18nKey: 'preset_charcoal',
    light: {
      bg: { primary: '#FFFFFF', secondary: '#F6F6F8', tertiary: '#ECECF0' },
      text: { primary: '#18181B', secondary: '#3F3F46', muted: '#A1A1AA' },
      brand: {
        primary: '#18181B', primaryHover: '#27272A',
        secondary: '#E11D48', secondaryHover: '#BE123C',
        gradient: 'linear-gradient(135deg, #18181B, #E11D48)',
      },
      semantic: { success: '#16A34A', warning: '#EAB308', error: '#E11D48', info: '#6366F1' },
      surface: {
        card: '#FFFFFF', cardBorder: '#E4E4E7',
        input: '#F6F6F8', inputBorder: '#D4D4D8', inputFocus: '#E11D48',
      },
    },
    dark: {
      bg: { primary: '#09090B', secondary: '#111114', tertiary: '#18181B' },
      text: { primary: '#FAFAFA', secondary: '#A1A1AA', muted: '#52525B' },
      brand: {
        primary: '#FAFAFA', primaryHover: '#E4E4E7',
        secondary: '#FB7185', secondaryHover: '#FDA4AF',
        gradient: 'linear-gradient(135deg, #FAFAFA, #FB7185)',
      },
      semantic: { success: '#34D399', warning: '#FDE047', error: '#FB7185', info: '#818CF8' },
      surface: {
        card: '#111114', cardBorder: '#27272A',
        input: '#18181B', inputBorder: '#27272A', inputFocus: '#FB7185',
      },
    },
  },
  {
    key: 'forest',
    i18nKey: 'preset_forest',
    light: {
      bg: { primary: '#FEFDFB', secondary: '#F5F2ED', tertiary: '#EBE6DE' },
      text: { primary: '#1C1917', secondary: '#44403C', muted: '#A8A29E' },
      brand: {
        primary: '#991B1B', primaryHover: '#7F1D1D',
        secondary: '#C4841D', secondaryHover: '#A96E15',
        gradient: 'linear-gradient(135deg, #991B1B, #C4841D)',
      },
      semantic: { success: '#7C6A2A', warning: '#D97706', error: '#DC2626', info: '#8B6F47' },
      surface: {
        card: '#FEFDFB', cardBorder: '#DDD8D0',
        input: '#F5F2ED', inputBorder: '#C8C1B7', inputFocus: '#991B1B',
      },
    },
    dark: {
      bg: { primary: '#100D0B', secondary: '#1A1512', tertiary: '#221C18' },
      text: { primary: '#F5F0EB', secondary: '#A89080', muted: '#5C4F44' },
      brand: {
        primary: '#DC2626', primaryHover: '#EF4444',
        secondary: '#E09F3E', secondaryHover: '#EBB45A',
        gradient: 'linear-gradient(135deg, #DC2626, #E09F3E)',
      },
      semantic: { success: '#C4A235', warning: '#FBBF24', error: '#F87171', info: '#D4A574' },
      surface: {
        card: '#1A1512', cardBorder: '#2E2620',
        input: '#221C18', inputBorder: '#332A22', inputFocus: '#DC2626',
      },
    },
  },
]
