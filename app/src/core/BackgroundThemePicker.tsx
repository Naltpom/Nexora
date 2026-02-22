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
