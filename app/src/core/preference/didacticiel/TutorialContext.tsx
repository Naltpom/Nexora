import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useFeature } from '../../../core/FeatureContext'
import { usePermission } from '../../../core/PermissionContext'
import { useAuth } from '../../../core/AuthContext'
import api from '../../../api'
import type { TutorialDefinition } from '../../../types'

const featureModules = {
  ...import.meta.glob('../../*/index.ts', { eager: true }),
  ...import.meta.glob('../../../custom_features/*/index.ts', { eager: true }),
} as Record<string, any>

interface TutorialContextType {
  tutorials: TutorialDefinition[]
  seenTutorials: Record<string, string>
  activeTutorial: TutorialDefinition | null
  activeStepIndex: number
  startTutorial: (id: string) => void
  nextStep: () => void
  prevStep: () => void
  skipTutorial: () => void
  markSeen: (id: string) => Promise<void>
  resetAll: () => Promise<void>
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { isActive } = useFeature()
  const { can } = usePermission()
  const { user } = useAuth()
  const location = useLocation()

  const [seenTutorials, setSeenTutorials] = useState<Record<string, string>>({})
  const [activeTutorial, setActiveTutorial] = useState<TutorialDefinition | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [seenLoaded, setSeenLoaded] = useState(false)

  // Collect tutorials from active feature manifests
  const tutorials: TutorialDefinition[] = []
  for (const [, mod] of Object.entries(featureModules)) {
    const manifest = (mod as any).manifest
    if (!manifest || !isActive(manifest.name)) continue
    if (manifest.tutorials) {
      for (const tut of manifest.tutorials as TutorialDefinition[]) {
        if (tut.permission && !can(tut.permission)) continue
        tutorials.push(tut)
      }
    }
  }

  // Fetch seen state from backend
  useEffect(() => {
    if (!user) return
    api.get('/preference/didacticiel/seen')
      .then(res => {
        setSeenTutorials(res.data.tutorials_seen || {})
        setSeenLoaded(true)
      })
      .catch(() => setSeenLoaded(true))
  }, [user])

  // Auto-trigger tutorial on route change
  useEffect(() => {
    if (!seenLoaded || activeTutorial) return
    const match = tutorials.find(t =>
      t.triggerPath &&
      location.pathname === t.triggerPath &&
      !seenTutorials[t.id]
    )
    if (match) {
      const timer = setTimeout(() => {
        setActiveTutorial(match)
        setActiveStepIndex(0)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, seenLoaded])

  const markSeen = useCallback(async (id: string) => {
    setSeenTutorials(prev => ({ ...prev, [id]: new Date().toISOString() }))
    try {
      await api.post('/preference/didacticiel/seen', { tutorial_id: id })
    } catch {
      // Already updated locally
    }
  }, [])

  const startTutorial = useCallback((id: string) => {
    const tut = tutorials.find(t => t.id === id)
    if (tut) {
      setActiveTutorial(tut)
      setActiveStepIndex(0)
    }
  }, [tutorials.map(t => t.id).join(',')])

  const nextStep = useCallback(() => {
    setActiveTutorial(prev => {
      if (!prev) return null
      setActiveStepIndex(idx => {
        if (idx < prev.steps.length - 1) {
          return idx + 1
        } else {
          markSeen(prev.id)
          setTimeout(() => setActiveTutorial(null), 0)
          return 0
        }
      })
      return prev
    })
  }, [markSeen])

  const prevStep = useCallback(() => {
    setActiveStepIndex(idx => (idx > 0 ? idx - 1 : idx))
  }, [])

  const skipTutorial = useCallback(() => {
    setActiveTutorial(prev => {
      if (prev) markSeen(prev.id)
      return null
    })
    setActiveStepIndex(0)
  }, [markSeen])

  const resetAll = useCallback(async () => {
    setSeenTutorials({})
    try {
      await api.delete('/preference/didacticiel/seen')
    } catch {
      // Already cleared locally
    }
  }, [])

  return (
    <TutorialContext.Provider value={{
      tutorials, seenTutorials, activeTutorial, activeStepIndex,
      startTutorial, nextStep, prevStep, skipTutorial, markSeen, resetAll,
    }}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider')
  }
  return context
}
