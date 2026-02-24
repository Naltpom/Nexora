import './backgrounds/backgrounds.scss'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthContext'

const THEMES = [
  {
    id: 1,
    labelKey: 'bg_theme_gradient',
    previewStyle: {
      background: 'linear-gradient(135deg, #a8b8ff, #c9a0e0, #f9cdf0, #ffb3bf)',
      backgroundSize: '200% 200%',
      animation: 'breathingGradient 6s ease infinite',
    },
    previewStyleDark: {
      background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c)',
      backgroundSize: '200% 200%',
      animation: 'breathingGradient 6s ease infinite',
    },
  },
  {
    id: 2,
    labelKey: 'bg_theme_particles',
    previewStyle: {
      background: 'radial-gradient(circle at 30% 40%, hsla(220, 80%, 45%, 0.3), transparent 50%), radial-gradient(circle at 70% 60%, hsla(260, 80%, 45%, 0.3), transparent 50%), #f0f0fa',
    },
    previewStyleDark: {
      background: 'radial-gradient(circle at 30% 40%, hsla(220, 80%, 60%, 0.4), transparent 50%), radial-gradient(circle at 70% 60%, hsla(260, 80%, 60%, 0.4), transparent 50%), #0f0f1a',
    },
  },
  {
    id: 3,
    labelKey: 'bg_theme_hue_rotation',
    previewStyle: {
      background: 'linear-gradient(135deg, hsl(0, 60%, 75%), hsl(60, 60%, 75%), hsl(180, 60%, 75%))',
      animation: 'huePreviewRotate 8s linear infinite',
    },
    previewStyleDark: {
      background: 'linear-gradient(135deg, hsl(0, 70%, 50%), hsl(60, 70%, 50%), hsl(180, 70%, 50%))',
      animation: 'huePreviewRotate 8s linear infinite',
    },
  },
  {
    id: 4,
    labelKey: 'bg_theme_mesh_blobs',
    previewStyle: {
      background: 'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.3), transparent 50%), radial-gradient(circle at 80% 70%, rgba(168,85,247,0.25), transparent 50%), radial-gradient(circle at 50% 50%, rgba(34,197,94,0.15), transparent 50%), #f8fafc',
    },
    previewStyleDark: {
      background: 'radial-gradient(circle at 20% 30%, rgba(102,126,234,0.5), transparent 50%), radial-gradient(circle at 80% 70%, rgba(240,147,251,0.35), transparent 50%), radial-gradient(circle at 50% 50%, rgba(79,172,254,0.3), transparent 50%), #0a0a12',
    },
  },
  {
    id: 5,
    labelKey: 'bg_theme_aurora',
    previewStyle: {
      background: 'radial-gradient(circle at 30% 40%, rgba(139,92,246,0.3), transparent 50%), radial-gradient(circle at 70% 50%, rgba(59,130,246,0.25), transparent 50%), radial-gradient(circle at 50% 70%, rgba(236,72,153,0.2), transparent 50%), #eef2ff',
    },
    previewStyleDark: {
      background: 'radial-gradient(circle at 30% 40%, rgba(139,92,246,0.5), transparent 50%), radial-gradient(circle at 70% 50%, rgba(59,130,246,0.45), transparent 50%), radial-gradient(circle at 50% 70%, rgba(236,72,153,0.35), transparent 50%), #0a0a18',
    },
  },
  {
    id: 6,
    labelKey: 'bg_theme_waves',
    previewStyle: {
      background: 'linear-gradient(180deg, #f0f4ff 0%, rgba(99,102,241,0.12) 60%, rgba(139,92,246,0.1) 80%, #f0f4ff 100%)',
    },
    previewStyleDark: {
      background: 'linear-gradient(180deg, #0a0a18 0%, rgba(99,102,241,0.25) 60%, rgba(139,92,246,0.2) 80%, #0a0a18 100%)',
    },
  },
  {
    id: 7,
    labelKey: 'bg_theme_noise_gradient',
    previewStyle: {
      background: 'linear-gradient(135deg, #fef9ef, #fde8e8, #e8f4fd, #fef9ef)',
    },
    previewStyleDark: {
      background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
    },
  },
  {
    id: 8,
    labelKey: 'bg_theme_neon_grid',
    previewStyle: {
      background: `repeating-linear-gradient(0deg, rgba(99,102,241,0.08) 0px, rgba(99,102,241,0.08) 1px, transparent 1px, transparent 12px), repeating-linear-gradient(90deg, rgba(99,102,241,0.08) 0px, rgba(99,102,241,0.08) 1px, transparent 1px, transparent 12px), radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.12), transparent 70%), #f8faff`,
    },
    previewStyleDark: {
      background: `repeating-linear-gradient(0deg, rgba(99,102,241,0.15) 0px, rgba(99,102,241,0.15) 1px, transparent 1px, transparent 12px), repeating-linear-gradient(90deg, rgba(99,102,241,0.15) 0px, rgba(99,102,241,0.15) 1px, transparent 1px, transparent 12px), radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.3), transparent 70%), #0a0a14`,
    },
  },
  {
    id: 9,
    labelKey: 'bg_theme_constellations',
    previewStyle: {
      background: 'radial-gradient(1px 1px at 20% 30%, rgba(80,90,160,0.6), transparent), radial-gradient(1px 1px at 40% 70%, rgba(80,90,160,0.5), transparent), radial-gradient(1px 1px at 60% 20%, rgba(80,90,160,0.4), transparent), radial-gradient(1px 1px at 80% 60%, rgba(80,90,160,0.6), transparent), radial-gradient(1px 1px at 50% 50%, rgba(80,90,160,0.5), transparent), #f0f2fa',
    },
    previewStyleDark: {
      background: 'radial-gradient(1px 1px at 20% 30%, rgba(200,210,255,0.8), transparent), radial-gradient(1px 1px at 40% 70%, rgba(200,210,255,0.6), transparent), radial-gradient(1px 1px at 60% 20%, rgba(200,210,255,0.5), transparent), radial-gradient(1px 1px at 80% 60%, rgba(200,210,255,0.8), transparent), radial-gradient(1px 1px at 50% 50%, rgba(200,210,255,0.6), transparent), #08081a',
    },
  },
]

interface BackgroundThemePickerProps {
  isOpen: boolean
  onClose: () => void
}

export default function BackgroundThemePicker({ isOpen, onClose }: BackgroundThemePickerProps) {
  const { t } = useTranslation('common')
  const { getPreference, updatePreference } = useAuth()
  const current = getPreference('backgroundTheme', 4)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  const handleSelect = (variant: number) => {
    document.documentElement.setAttribute('data-bg-theme', String(variant))
    updatePreference('backgroundTheme', variant)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="bg-theme-picker" onClick={e => e.stopPropagation()}>
        <h3>{t('background_picker_title')}</h3>
        <div className="bg-theme-grid">
          {THEMES.map(theme => (
            <button
              key={theme.id}
              className={`bg-theme-option ${current === theme.id ? 'active' : ''}`}
              onClick={() => handleSelect(theme.id)}
            >
              <div
                className="bg-theme-preview"
                style={isDark ? theme.previewStyleDark : theme.previewStyle}
              />
              <span>{t(theme.labelKey)}</span>
            </button>
          ))}
        </div>
        <div className="bg-theme-hint">{t('background_picker_hint')}</div>
      </div>
    </div>
  )
}
