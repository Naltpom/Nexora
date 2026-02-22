/**
 * i18next initialization with auto-discovery of feature translation files.
 *
 * Translation files are discovered from:
 * - ./locales/LOCALE/NAMESPACE.json             (global common translations)
 * - ../FEATURE/i18n/LOCALE.json                (core feature translations)
 * - ../../features/FEATURE/i18n/LOCALE.json    (project feature translations)
 *
 * Namespace is derived from the parent directory name (= feature name).
 * Sub-features use dot notation: preference/theme/i18n/fr.json -> namespace "preference.theme"
 */

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

// Auto-discover translation files via Vite glob imports
const globalLocales = import.meta.glob('./locales/*/*.json', { eager: true }) as Record<string, { default: Record<string, string> }>
const coreFeatureLocales = import.meta.glob('../*/i18n/*.json', { eager: true }) as Record<string, { default: Record<string, string> }>
const coreSubFeatureLocales = import.meta.glob('../*/*/i18n/*.json', { eager: true }) as Record<string, { default: Record<string, string> }>
const projectFeatureLocales = import.meta.glob('../../features/*/i18n/*.json', { eager: true }) as Record<string, { default: Record<string, string> }>

type Resources = Record<string, Record<string, Record<string, string>>>

function buildResources(): Resources {
  const resources: Resources = {}

  const addTranslations = (locale: string, namespace: string, data: Record<string, string>) => {
    if (!resources[locale]) resources[locale] = {}
    if (!resources[locale][namespace]) resources[locale][namespace] = {}
    Object.assign(resources[locale][namespace], data)
  }

  // 1. Global locales: ./locales/fr/common.json -> locale=fr, namespace=common
  for (const [path, mod] of Object.entries(globalLocales)) {
    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
    if (match) {
      const [, locale, namespace] = match
      addTranslations(locale, namespace, (mod as any).default || mod)
    }
  }

  // 2. Core feature locales: ../preference/i18n/fr.json -> locale=fr, namespace=preference
  for (const [path, mod] of Object.entries(coreFeatureLocales)) {
    const match = path.match(/\.\.\/([^/]+)\/i18n\/([^/]+)\.json$/)
    if (match) {
      const [, feature, locale] = match
      addTranslations(locale, feature, (mod as any).default || mod)
    }
  }

  // 3. Core sub-feature locales: ../preference/theme/i18n/fr.json -> locale=fr, namespace=preference.theme
  for (const [path, mod] of Object.entries(coreSubFeatureLocales)) {
    const match = path.match(/\.\.\/([^/]+)\/([^/]+)\/i18n\/([^/]+)\.json$/)
    if (match) {
      const [, parent, child, locale] = match
      addTranslations(locale, `${parent}.${child}`, (mod as any).default || mod)
    }
  }

  // 4. Project feature locales: ../../features/my_feature/i18n/fr.json -> locale=fr, namespace=my_feature
  for (const [path, mod] of Object.entries(projectFeatureLocales)) {
    const match = path.match(/\.\.\/\.\.\/features\/([^/]+)\/i18n\/([^/]+)\.json$/)
    if (match) {
      const [, feature, locale] = match
      addTranslations(locale, feature, (mod as any).default || mod)
    }
  }

  return resources
}

const resources = buildResources()

i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: 'fr',
    fallbackLng: 'fr',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    showSupportNotice: false,
  })

export default i18next
