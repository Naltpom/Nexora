import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDraftPreference } from '../DraftPreferenceContext'
import BackgroundThemePicker from '../../../core/BackgroundThemePicker'
import '../../_identity/_identity.scss'
import '../preference.scss'

export default function ThemeSection() {
  const { t } = useTranslation('preference.theme')
  const { getDraftPreference, setDraftPreference } = useDraftPreference()
  const currentTheme = getDraftPreference('theme', 'light') as string
  const currentBg = getDraftPreference('backgroundTheme', 4) as number
  const [showBgPicker, setShowBgPicker] = useState(false)

  const handleThemeChange = (theme: string) => {
    setDraftPreference('theme', theme)
  }

  const handleBgSelect = (variant: number) => {
    setDraftPreference('backgroundTheme', variant)
  }

  return (
    <div className="unified-card card-padded preference-theme-section">
      <h2 className="title-sm">{t('section_title')}</h2>

      <div className="form-group pref-form-group-spaced">
        <label>{t('label_mode')}</label>
        <div className="flex-row">
          <button
            className={`btn ${currentTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('light')}
            type="button"
          >
            {t('btn_light')}
          </button>
          <button
            className={`btn ${currentTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleThemeChange('dark')}
            type="button"
          >
            {t('btn_dark')}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>{t('label_wallpaper')}</label>
        <div className="pref-actions-row">
          <button className="btn btn-secondary" onClick={() => setShowBgPicker(true)} type="button">
            {t('btn_choose_wallpaper')}
          </button>
          <span className="pref-hint">
            {t('hint_shortcut')}
          </span>
        </div>
      </div>

      {showBgPicker && (
        <BackgroundThemePicker
          isOpen={true}
          onClose={() => setShowBgPicker(false)}
          onSelect={handleBgSelect}
          currentValue={currentBg}
        />
      )}
    </div>
  )
}
