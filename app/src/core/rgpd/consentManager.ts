/**
 * consentManager — Pure TypeScript module (no React).
 * Importable from main.tsx (before React mounts) and from components.
 */

interface ConsentState {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
  date?: string
}

export const CONSENT_KEY = 'rgpd_consent_given'

const FUNCTIONAL_SESSION_KEYS = [
  'tutorial_active',
  'tutorial_pending_dismissed',
  'mfa_banner_dismissed',
]

/** Parse stored consent. Returns conservative defaults if missing/corrupt. */
export function getConsentState(): ConsentState {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { necessary: true, functional: false, analytics: false, marketing: false }
}

/** Check if a specific consent category is granted. */
export function hasConsent(category: keyof Omit<ConsentState, 'date'>): boolean {
  if (category === 'necessary') return true
  return getConsentState()[category] === true
}

/** Whether the consent banner has been answered at all. */
export function hasConsentRecord(): boolean {
  return localStorage.getItem(CONSENT_KEY) !== null
}

/** Purge all functional-category storage when consent is revoked. */
export function cleanupFunctionalStorage(): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (key.startsWith('preferences_')) keysToRemove.push(key)
    if (key === 'push_prompt_dismissed') keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
  FUNCTIONAL_SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k))
}
