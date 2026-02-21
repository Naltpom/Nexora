import { useState } from 'react'
import { useAuth } from '../../../core/AuthContext'
import { useDraftPreference } from '../DraftPreferenceContext'
import BackgroundThemePicker from '../../../core/BackgroundThemePicker'
import '../../_identity/_identity.scss'
import '../preference.scss'

export default function ThemeSection() {
  const { getDraftPreference, setDraftPreference } = useDraftPreference()
  const { updatePreference, getPreference } = useAuth()
  const currentTheme = getDraftPreference('theme', 'light') as string
  const [showBgPicker, setShowBgPicker] = useState(false)

  const handleThemeChange = (theme: string) => {
    setDraftPreference('theme', theme)
  }

  // BackgroundThemePicker saves immediately (not part of draft system)
  const handleBgSelect = (bgTheme: number) => {
    updatePreference('backgroundTheme', bgTheme)
    document.documentElement.setAttribute('data-bg-theme', String(bgTheme))
  }

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">Theme et Apparence</h2>

      <div className="form-group pref-form-group-spaced">
        <label>Mode</label>
        <div className="flex-row">
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
        <div className="pref-actions-row">
          <button className="btn btn-secondary" onClick={() => setShowBgPicker(true)} type="button">
            Choisir un fond
          </button>
          <span className="pref-hint">
            ou Alt + T
          </span>
        </div>
      </div>

      {showBgPicker && <BackgroundThemePicker isOpen={true} onClose={() => setShowBgPicker(false)} />}
    </div>
  )
}
