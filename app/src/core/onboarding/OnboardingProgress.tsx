import { useTranslation } from 'react-i18next'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export default function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const { t } = useTranslation('onboarding')

  return (
    <div
      className="onboarding-progress"
      role="progressbar"
      aria-label={t('progress_step', { current: currentStep + 1, total: totalSteps })}
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`onboarding-dot${
            i === currentStep ? ' onboarding-dot--active' : i < currentStep ? ' onboarding-dot--done' : ''
          }`}
        />
      ))}
    </div>
  )
}
