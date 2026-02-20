import { ReactNode } from 'react'
import { TutorialProvider } from './TutorialContext'
import TutorialEngine from './TutorialEngine'
import TutorialNotification from './TutorialNotification'

export default function TutorialWrapper({ children }: { children: ReactNode }) {
  return (
    <TutorialProvider>
      {children}
      <TutorialEngine />
      <TutorialNotification />
    </TutorialProvider>
  )
}
