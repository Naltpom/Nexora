import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../AuthContext'
import api from '../../../api'
import './langue.scss'

interface LocaleInfo {
  code: string
  label: string
  is_default: boolean
}

export default function LangueSection() {
  const { t, i18n } = useTranslation('preference.langue')
  const { getPreference, updatePreference } = useAuth()
  const [locales, setLocales] = useState<LocaleInfo[]>([])
  const [selected, setSelected] = useState(getPreference('language', 'fr'))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get('/i18n/locales')
      .then((res) => setLocales(res.data))
      .catch(() => {})
  }, [])

  const handleChange = async (code: string) => {
    if (code === selected) return
    const previousCode = selected
    setSelected(code)
    setSaving(true)
    try {
      const res = await api.put('/preferences/language', { language: code })

      // Store new access token with updated lang claim
      if (res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token)
      }

      // Sync local state (localStorage + React user state)
      await updatePreference('language', code)

      i18n.changeLanguage(code)
      document.documentElement.lang = code
    } catch {
      setSelected(previousCode)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="unified-card card-padded">
      <h2 className="title-sm">{t('title')}</h2>
      <p className="langue-section__desc">
        {t('description')}
      </p>

      <div className="langue-section__grid">
        {locales.map((locale) => (
          <label
            key={locale.code}
            className={`langue-section__card ${selected === locale.code ? 'langue-section__card--active' : ''}`}
          >
            <input
              type="radio"
              name="language"
              value={locale.code}
              checked={selected === locale.code}
              onChange={() => handleChange(locale.code)}
              disabled={saving}
              className="langue-section__radio"
            />
            <span className="langue-section__label">{locale.label}</span>
            {locale.is_default && (
              <span className="langue-section__badge">{t('default_badge')}</span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
