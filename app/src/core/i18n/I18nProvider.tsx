import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { useAuth } from '../AuthContext'

interface I18nProviderProps {
  children: React.ReactNode
}

export default function I18nProvider({ children }: I18nProviderProps) {
  const { getPreference } = useAuth()
  const lang = getPreference('language', 'fr')

  useEffect(() => {
    if (lang && lang !== i18n.language) {
      i18n.changeLanguage(lang)
    }
    document.documentElement.lang = lang || 'fr'
  }, [lang])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
