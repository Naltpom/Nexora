/**
 * i18next initialization with auto-discovery of feature translation files.
 *
 * Translation files are discovered from:
 * - ./locales/LOCALE/NAMESPACE.json             (global common translations — eager)
 * - ../FEATURE/i18n/LOCALE.json                (core feature translations — lazy)
 * - ../FEATURE/SUB/i18n/LOCALE.json            (core sub-feature translations — lazy)
 * - ../../features/FEATURE/i18n/LOCALE.json    (project feature translations — lazy)
 *
 * Namespace is derived from the parent directory name (= feature name).
 * Sub-features use dot notation: preference/theme/i18n/fr.json -> namespace "preference.theme"
 *
 * The "common" namespace is loaded eagerly (synchronous access via i18next.t('common:key')).
 * All feature namespaces are loaded lazily on first use via i18next-resources-to-backend.
 */

import i18next from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'

// ---------------------------------------------------------------------------
// 1. Eager: translations loaded synchronously (available before first render)
//    - common: global shared translations
//    - _identity: login/register pages (first thing the user sees)
// ---------------------------------------------------------------------------
const globalLocales = import.meta.glob('./locales/*/*.json', { eager: true }) as Record<string, { default: Record<string, string> }>
const identityLocales = import.meta.glob('../_identity/i18n/*.json', { eager: true }) as Record<string, { default: Record<string, string> }>

// ---------------------------------------------------------------------------
// 2. Lazy: feature translations (loaded on demand when namespace is requested)
// ---------------------------------------------------------------------------
type LazyModule = () => Promise<{ default: Record<string, string> }>

const coreFeatureLocales = import.meta.glob('../*/i18n/*.json') as Record<string, LazyModule>
const coreSubFeatureLocales = import.meta.glob('../*/*/i18n/*.json') as Record<string, LazyModule>
const projectFeatureLocales = import.meta.glob('../../features/*/i18n/*.json') as Record<string, LazyModule>

// ---------------------------------------------------------------------------
// Build eager resources (common + _identity)
// ---------------------------------------------------------------------------
type Resources = Record<string, Record<string, Record<string, string>>>

function buildEagerResources(): Resources {
  const resources: Resources = {}

  const addTranslations = (locale: string, namespace: string, data: Record<string, string>) => {
    if (!resources[locale]) resources[locale] = {}
    if (!resources[locale][namespace]) resources[locale][namespace] = {}
    Object.assign(resources[locale][namespace], data)
  }

  // Global locales: ./locales/fr/common.json -> locale=fr, namespace=common
  for (const [path, mod] of Object.entries(globalLocales)) {
    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
    if (match) {
      const [, locale, namespace] = match
      addTranslations(locale, namespace, (mod as any).default || mod)
    }
  }

  // Identity locales: ../_identity/i18n/fr.json -> locale=fr, namespace=_identity
  for (const [path, mod] of Object.entries(identityLocales)) {
    const match = path.match(/\.\.\/_identity\/i18n\/([^/]+)\.json$/)
    if (match) {
      const locale = match[1]
      addTranslations(locale, '_identity', (mod as any).default || mod)
    }
  }

  return resources
}

// ---------------------------------------------------------------------------
// Build lazy lookup map: "locale/namespace" -> () => Promise<translations>
// ---------------------------------------------------------------------------
type LazyLookup = Record<string, LazyModule>

function buildLazyLookup(): LazyLookup {
  const lookup: LazyLookup = {}

  // Core feature locales: ../preference/i18n/fr.json -> key="fr/preference"
  for (const [path, loader] of Object.entries(coreFeatureLocales)) {
    const match = path.match(/\.\.\/([^/]+)\/i18n\/([^/]+)\.json$/)
    if (match) {
      const [, feature, locale] = match
      lookup[`${locale}/${feature}`] = loader
    }
  }

  // Core sub-feature locales: ../preference/theme/i18n/fr.json -> key="fr/preference.theme"
  for (const [path, loader] of Object.entries(coreSubFeatureLocales)) {
    const match = path.match(/\.\.\/([^/]+)\/([^/]+)\/i18n\/([^/]+)\.json$/)
    if (match) {
      const [, parent, child, locale] = match
      lookup[`${locale}/${parent}.${child}`] = loader
    }
  }

  // Project feature locales: ../../features/my_feature/i18n/fr.json -> key="fr/my_feature"
  for (const [path, loader] of Object.entries(projectFeatureLocales)) {
    const match = path.match(/\.\.\/\.\.\/features\/([^/]+)\/i18n\/([^/]+)\.json$/)
    if (match) {
      const [, feature, locale] = match
      lookup[`${locale}/${feature}`] = loader
    }
  }

  return lookup
}

// ---------------------------------------------------------------------------
// Initialize i18next
// ---------------------------------------------------------------------------
const eagerResources = buildEagerResources()
const lazyLookup = buildLazyLookup()

const lazyBackend = resourcesToBackend((locale: string, namespace: string) => {
  const key = `${locale}/${namespace}`
  const loader = lazyLookup[key]
  if (loader) {
    return loader().then((mod) => (mod as any).default || mod)
  }
  // Return empty object for unknown namespaces (prevents i18next errors)
  return Promise.resolve({})
})

i18next
  .use(lazyBackend)
  .use(initReactI18next)
  .init({
    resources: eagerResources,
    partialBundledLanguages: true,
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
