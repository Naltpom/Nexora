import { useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import BackgroundThemePicker from '../../../core/BackgroundThemePicker'

export default function ThemeSection() {
  const { getPreference, updatePreference } = useAuth()
  const currentTheme = getPreference('theme', 'light') as string
  const [showBgPicker, setShowBgPicker] = useState(false)

  const handleThemeChange = (theme: string) => {
    updatePreference('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  return (
    <div className="unified-card" style={{ padding: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Theme et Apparence</h2>

      <div className="form-group" style={{ marginBottom: 20 }}>
        <label>Mode</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('light')}
            type="button"
          >
            Clair
          </button>
          <button
            className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('dark')}
            type="button"
          >
            Sombre
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Fond d'ecran</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowBgPicker(true)} type="button">
            Choisir un fond
          </button>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
            ou Alt + T
          </span>
        </div>
      </div>

      {showBgPicker && <BackgroundThemePicker isOpen={true} onClose={() => setShowBgPicker(false)} />}
    </div>
  )
}
