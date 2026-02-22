import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../AuthContext'
import axios from 'axios'
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
    axios
      .get('/api/i18n/locales')
      .then((res) => setLocales(res.data))
      .catch(() => {})
  }, [])

  const handleChange = async (code: string) => {
    if (code === selected) return
    setSelected(code)
    setSaving(true)
    try {
      await axios.put('/api/preferences/language', { language: code })
      await updatePreference('language', code)
      i18n.changeLanguage(code)
      document.documentElement.lang = code
    } catch {
      // revert on error
      setSelected(selected)
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
