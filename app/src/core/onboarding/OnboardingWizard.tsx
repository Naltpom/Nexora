import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import i18next from 'i18next'
import { useAuth } from '../AuthContext'
import { useFeature } from '../FeatureContext'
import { usePermission } from '../PermissionContext'
import { applyFontPrefs, applyLayoutPrefs, applyAccessibilitePrefs } from '../preference/applyPreferences'
import api, { setAccessToken } from '../../api'
import OnboardingProgress from './OnboardingProgress'
import StepWelcomeProfile from './StepWelcomeProfile'
import StepThemeLangue from './StepThemeLangue'
import StepAccessibilite from './StepAccessibilite'
import StepPreferencesUI from './StepPreferencesUI'
import StepFeatureShowcase from './StepFeatureShowcase'
import './onboarding.scss'

import type { User } from '../../types'
import type { AccessibilitePrefs } from '../preference/applyPreferences'

interface StepDef {
  id: string
  feature?: string
  permission?: string
}

const STEP_DEFS: StepDef[] = [
  { id: 'welcome' },
  { id: 'theme', feature: 'preference.theme', permission: 'preference.theme.read' },
  { id: 'a11y', feature: 'preference.accessibilite', permission: 'preference.accessibilite.read' },
  { id: 'ui', feature: 'preference.layout', permission: 'preference.layout.read' },
  { id: 'showcase' },
]

interface OnboardingWizardProps {
  user: User
  onComplete: () => Promise<void>
  onSkip: () => Promise<void>
}

export default function OnboardingWizard({ user, onComplete, onSkip }: OnboardingWizardProps) {
  const { t } = useTranslation('onboarding')
  const { updatePreference, refreshUser, getPreference } = useAuth()
  const { isActive } = useFeature()
  const { can } = usePermission()

  const steps = useMemo(
    () => STEP_DEFS.filter(s =>
      (!s.feature || isActive(s.feature)) && (!s.permission || can(s.permission))
    ),
    [isActive, can],
  )

  const [currentStep, setCurrentStep] = useState(0)
  const [saving, setSaving] = useState(false)

  // Step: Profile
  const [firstName, setFirstName] = useState(user.first_name || '')
  const [lastName, setLastName] = useState(user.last_name || '')

  // Step: Theme & Language
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light'
  const [theme, setTheme] = useState(currentTheme)
  const [language, setLanguage] = useState(getPreference('language', 'fr'))

  // Step: Accessibilite
  const savedA11y = getPreference('accessibilite', {})
  const [a11yPrefs, setA11yPrefs] = useState<AccessibilitePrefs>(() => ({
    highContrast: false,
    reduceMotion: false,
    dyslexia: false,
    focusVisible: false,
    underlineLinks: false,
    largeTargets: false,
    ...savedA11y,
  }))

  // Step: Preferences UI
  const layoutPrefs = getPreference('layout', {})
  const fontPrefs = getPreference('font', {})
  const [density, setDensity] = useState<string>(layoutPrefs.density || 'normal')
  const [fontScale, setFontScale] = useState<number>(fontPrefs.scale || 100)
  const [radius, setRadius] = useState<number>(layoutPrefs.radius ?? 8)

  // ── Theme handlers (live preview) ──

  const handleThemeChange = (value: string) => {
    setTheme(value)
    document.documentElement.setAttribute('data-theme', value)
  }

  const handleLanguageChange = (code: string) => {
    setLanguage(code)
    i18next.changeLanguage(code)
  }

  // ── Accessibilite handler (live preview) ──

  const handleA11yToggle = (key: keyof AccessibilitePrefs, value: boolean) => {
    const next = { ...a11yPrefs, [key]: value }
    setA11yPrefs(next)
    applyAccessibilitePrefs(next)
  }

  // ── Preferences handlers (live preview) ──

  const handleDensityChange = (value: string) => {
    setDensity(value)
    applyLayoutPrefs({ density: value, radius })
  }

  const handleFontScaleChange = (value: number) => {
    setFontScale(value)
    applyFontPrefs({ scale: value })
  }

  const handleRadiusChange = (value: number) => {
    setRadius(value)
    applyLayoutPrefs({ density, radius: value })
  }

  // ── Save logic per step ──

  const saveCurrentStep = async () => {
    const stepId = steps[currentStep]?.id
    switch (stepId) {
      case 'welcome': {
        const nameChanged = firstName !== (user.first_name || '') || lastName !== (user.last_name || '')
        if (nameChanged) {
          await api.put('/auth/me', { first_name: firstName, last_name: lastName })
          await refreshUser()
        }
        break
      }
      case 'theme': {
        await updatePreference('theme', theme)
        const res = await api.put('/preferences/language', { language })
        if (res.data.access_token) {
          setAccessToken(res.data.access_token)
        }
        await updatePreference('language', language)
        document.documentElement.lang = language
        break
      }
      case 'a11y': {
        await updatePreference('accessibilite', a11yPrefs)
        break
      }
      case 'ui': {
        await updatePreference('layout', { ...layoutPrefs, density, radius })
        await updatePreference('font', { ...fontPrefs, scale: fontScale })
        break
      }
    }
  }

  // ── Navigation ──

  const handleNext = async () => {
    setSaving(true)
    try {
      await saveCurrentStep()
      if (currentStep < steps.length - 1) {
        setCurrentStep((s) => s + 1)
      }
    } catch (err) {
      console.error('[onboarding] save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      await saveCurrentStep()
      await api.post('/onboarding/complete')
      await onComplete()
    } catch (err) {
      console.error('[onboarding] finish error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    setSaving(true)
    try {
      await api.post('/onboarding/skip')
      await onSkip()
    } finally {
      setSaving(false)
    }
  }

  const stepId = steps[currentStep]?.id
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-wizard">
        <OnboardingProgress currentStep={currentStep} totalSteps={steps.length} />

        <div className="onboarding-body">
          {stepId === 'welcome' && (
            <StepWelcomeProfile
              firstName={firstName}
              lastName={lastName}
              onFirstNameChange={setFirstName}
              onLastNameChange={setLastName}
            />
          )}
          {stepId === 'theme' && (
            <StepThemeLangue
              theme={theme}
              language={language}
              onThemeChange={handleThemeChange}
              onLanguageChange={handleLanguageChange}
            />
          )}
          {stepId === 'a11y' && (
            <StepAccessibilite
              prefs={a11yPrefs}
              onToggle={handleA11yToggle}
            />
          )}
          {stepId === 'ui' && (
            <StepPreferencesUI
              density={density}
              fontScale={fontScale}
              radius={radius}
              onDensityChange={handleDensityChange}
              onFontScaleChange={handleFontScaleChange}
              onRadiusChange={handleRadiusChange}
            />
          )}
          {stepId === 'showcase' && <StepFeatureShowcase />}
        </div>

        <div className="onboarding-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSkip}
            disabled={saving}
          >
            {t('btn_skip')}
          </button>
          <div className="onboarding-footer-right">
            {currentStep > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handlePrev}
                disabled={saving}
              >
                {t('btn_prev')}
              </button>
            )}
            {isLastStep ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleFinish}
                disabled={saving}
              >
                {t('btn_finish')}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleNext}
                disabled={saving}
              >
                {t('btn_next')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
