import { ReactNode } from 'react'
import { TutorialProvider } from './TutorialContext'
import TutorialEngine from './TutorialEngine'

export default function TutorialWrapper({ children }: { children: ReactNode }) {
  return (
    <TutorialProvider>
      {children}
      <TutorialEngine />
    </TutorialProvider>
  )
}
