import { useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../AuthContext'
import { useFeature } from '../FeatureContext'
import OnboardingWizard from './OnboardingWizard'

export default function OnboardingOverlay() {
  const { user, isImpersonating, getPreference, updatePreference } = useAuth()
  const { isActive } = useFeature()
  const location = useLocation()
  const [dismissed, setDismissed] = useState(false)

  if (isImpersonating) return null
  if (location.pathname === '/accept-legal' || location.pathname === '/change-password') return null
  if (!user || dismissed || !isActive('onboarding') || getPreference('onboarding_completed') === true) {
    return null
  }

  const handleDismiss = async () => {
    await updatePreference('onboarding_completed', true)
    setDismissed(true)
  }

  return (
    <OnboardingWizard
      user={user}
      onComplete={handleDismiss}
      onSkip={handleDismiss}
    />
  )
}
