export interface ColorGroup {
  label: string
  vars: { name: string; label: string }[]
}

export const COLOR_GROUPS: ColorGroup[] = [
  {
    label: 'Couleurs principales',
    vars: [
      { name: 'primary', label: 'Primaire' },
      { name: 'primary-light', label: 'Primaire clair' },
      { name: 'primary-dark', label: 'Primaire sombre' },
    ],
  },
  {
    label: 'Couleurs de statut',
    vars: [
      { name: 'success', label: 'Succes' },
      { name: 'warning', label: 'Avertissement' },
      { name: 'danger', label: 'Danger' },
    ],
  },
  {
    label: 'Echelle de gris',
    vars: [
      { name: 'gray-50', label: 'Gris 50' },
      { name: 'gray-100', label: 'Gris 100' },
      { name: 'gray-200', label: 'Gris 200' },
      { name: 'gray-300', label: 'Gris 300' },
      { name: 'gray-400', label: 'Gris 400' },
      { name: 'gray-500', label: 'Gris 500' },
      { name: 'gray-600', label: 'Gris 600' },
      { name: 'gray-700', label: 'Gris 700' },
      { name: 'gray-800', label: 'Gris 800' },
      { name: 'gray-900', label: 'Gris 900' },
    ],
  },
]

export const LIGHT_DEFAULTS: Record<string, string> = {
  'primary': '#1E40AF',
  'primary-light': '#3B82F6',
  'primary-dark': '#1E3A8A',
  'success': '#059669',
  'warning': '#D97706',
  'danger': '#DC2626',
  'gray-50': '#F9FAFB',
  'gray-100': '#F3F4F6',
  'gray-200': '#E5E7EB',
  'gray-300': '#D1D5DB',
  'gray-400': '#9CA3AF',
  'gray-500': '#6B7280',
  'gray-600': '#4B5563',
  'gray-700': '#374151',
  'gray-800': '#1F2937',
  'gray-900': '#111827',
}

export const DARK_DEFAULTS: Record<string, string> = {
  'primary': '#8b5cf6',
  'primary-light': '#a78bfa',
  'primary-dark': '#7c3aed',
  'success': '#059669',
  'warning': '#D97706',
  'danger': '#DC2626',
  'gray-50': '#0a0a12',
  'gray-100': '#12121f',
  'gray-200': '#1a1a2e',
  'gray-300': '#252540',
  'gray-400': '#666680',
  'gray-500': '#808099',
  'gray-600': '#9999b3',
  'gray-700': '#b3b3cc',
  'gray-800': '#ccccdd',
  'gray-900': '#e5e5ee',
}
