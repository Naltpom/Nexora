import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { usePermission } from '../../PermissionContext'
import { useAuth } from '../../AuthContext'
import api from '../../../api'
import { hasConsent } from '../../rgpd/consentManager'
import type {
  FeatureTutorial,
  PermissionTutorial,
  TutorialStep,
} from '../../../types'

export interface ActiveTutorialState {
  featureName: string
  permissionIndex: number
  stepIndex: number
  mode: 'single' | 'chain'
  skipSeen?: boolean
}

interface TutorialContextType {
  featureTutorials: FeatureTutorial[]
  permissionsSeen: Record<string, string>
  active: ActiveTutorialState | null
  currentStep: TutorialStep | null
  currentPermissionTutorial: PermissionTutorial | null
  currentFeatureTutorial: FeatureTutorial | null
  totalStepsInChain: number
  currentStepInChain: number
  startFeatureTutorial: (featureName: string) => void
  startPermissionTutorial: (featureName: string, permission: string) => void
  startUnseenTutorials: () => void
  startAllTutorials: () => void
  nextStep: () => void
  prevStep: () => void
  skipCurrent: () => void
  skipAll: () => void
  closeTutorial: () => void
  markPermissionSeen: (permission: string) => Promise<void>
  resetAll: () => Promise<void>
  pendingNewPermissions: string[]
  dismissPending: () => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const { permissions } = usePermission()
  const { user } = useAuth()

  const [featureTutorials, setFeatureTutorials] = useState<FeatureTutorial[]>([])
  const [permissionsSeen, setPermissionsSeen] = useState<Record<string, string>>({})
  const [active, setActive] = useState<ActiveTutorialState | null>(null)
  const [seenLoaded, setSeenLoaded] = useState(false)
  const [pendingNewPermissions, setPendingNewPermissions] = useState<string[]>([])
  const [pendingDismissed, setPendingDismissed] = useState(
    () => hasConsent('functional') && sessionStorage.getItem('tutorial_pending_dismissed') === 'true'
  )

  // Fetch tutorials (filtered + ordered by backend), seen state
  useEffect(() => {
    if (!user) return
    api
      .get('/preference/didacticiel/tutorials')
      .then((res) => setFeatureTutorials(res.data))
      .catch(() => {})

    api
      .get('/preference/didacticiel/seen')
      .then((res) => {
        setPermissionsSeen(res.data.permissions_seen || {})
        setSeenLoaded(true)
      })
      .catch(() => setSeenLoaded(true))
  }, [user])

  // Restore active state from sessionStorage (RGPD: only if functional consent)
  useEffect(() => {
    if (!hasConsent('functional')) return
    const saved = sessionStorage.getItem('tutorial_active')
    if (saved) {
      try {
        const state = JSON.parse(saved) as ActiveTutorialState
        setActive(state)
      } catch {
        sessionStorage.removeItem('tutorial_active')
      }
    }
  }, [])

  // Persist active state to sessionStorage
  useEffect(() => {
    if (active) {
      if (hasConsent('functional')) {
        sessionStorage.setItem('tutorial_active', JSON.stringify(active))
      }
    } else {
      sessionStorage.removeItem('tutorial_active')
    }
  }, [active])

  // Detect unseen permissions
  useEffect(() => {
    if (!seenLoaded || !permissions.length || pendingDismissed) return

    const tutorialPerms = new Set<string>()
    for (const ft of featureTutorials) {
      for (const pt of ft.permissionTutorials) {
        tutorialPerms.add(pt.permission)
      }
    }

    const unseen = permissions.filter(
      (p) => tutorialPerms.has(p) && !permissionsSeen[p]
    )

    if (unseen.length > 0 && !active) {
      setPendingNewPermissions(unseen)
    }
  }, [seenLoaded, featureTutorials, permissionsSeen, permissions, pendingDismissed, active])

  // Helper to get current feature/permission/step from active state
  const currentFeatureTutorial = useMemo(() => {
    if (!active) return null
    return featureTutorials.find((ft) => ft.featureName === active.featureName) || null
  }, [active, featureTutorials])

  const currentPermissionTutorial = useMemo(() => {
    if (!active || !currentFeatureTutorial) return null
    return currentFeatureTutorial.permissionTutorials[active.permissionIndex] || null
  }, [active, currentFeatureTutorial])

  const currentStep = useMemo(() => {
    if (!active || !currentPermissionTutorial) return null
    return currentPermissionTutorial.steps[active.stepIndex] || null
  }, [active, currentPermissionTutorial])

  // Calculate total steps and current position in chain
  const { totalStepsInChain, currentStepInChain } = useMemo(() => {
    if (!active || !currentFeatureTutorial) return { totalStepsInChain: 0, currentStepInChain: 0 }

    if (active.mode === 'single' && currentPermissionTutorial) {
      return {
        totalStepsInChain: currentPermissionTutorial.steps.length,
        currentStepInChain: active.stepIndex + 1,
      }
    }

    // Chain mode: sum all steps across all permission tutorials in this feature
    let total = 0
    let current = 0
    for (let pi = 0; pi < currentFeatureTutorial.permissionTutorials.length; pi++) {
      const pt = currentFeatureTutorial.permissionTutorials[pi]
      if (pi < active.permissionIndex) {
        current += pt.steps.length
      } else if (pi === active.permissionIndex) {
        current += active.stepIndex + 1
      }
      total += pt.steps.length
    }
    return { totalStepsInChain: total, currentStepInChain: current }
  }, [active, currentFeatureTutorial, currentPermissionTutorial])

  const markPermissionSeen = useCallback(async (permission: string) => {
    setPermissionsSeen((prev) => ({ ...prev, [permission]: new Date().toISOString() }))
    try {
      await api.post('/preference/didacticiel/seen', { permission })
    } catch {
      // Already updated locally
    }
  }, [])

  const startFeatureTutorial = useCallback(
    (featureName: string) => {
      const ft = featureTutorials.find((f) => f.featureName === featureName)
      if (ft && ft.permissionTutorials.length > 0) {
        setActive({
          featureName,
          permissionIndex: 0,
          stepIndex: 0,
          mode: 'chain',
          skipSeen: false,
        })
        setPendingNewPermissions([])
      }
    },
    [featureTutorials]
  )

  const startPermissionTutorial = useCallback(
    (featureName: string, permission: string) => {
      const ft = featureTutorials.find((f) => f.featureName === featureName)
      if (!ft) return
      const pi = ft.permissionTutorials.findIndex((pt) => pt.permission === permission)
      if (pi >= 0) {
        setActive({
          featureName,
          permissionIndex: pi,
          stepIndex: 0,
          mode: 'single',
        })
        setPendingNewPermissions([])
      }
    },
    [featureTutorials]
  )

  const startUnseenTutorials = useCallback(() => {
    // Find first feature with unseen permission tutorials, start chain
    for (const ft of featureTutorials) {
      const unseenIdx = ft.permissionTutorials.findIndex(
        (pt) => !permissionsSeen[pt.permission]
      )
      if (unseenIdx >= 0) {
        setActive({
          featureName: ft.featureName,
          permissionIndex: unseenIdx,
          stepIndex: 0,
          mode: 'chain',
          skipSeen: true,
        })
        setPendingNewPermissions([])
        return
      }
    }
  }, [featureTutorials, permissionsSeen])

  const startAllTutorials = useCallback(() => {
    if (featureTutorials.length > 0 && featureTutorials[0].permissionTutorials.length > 0) {
      setActive({
        featureName: featureTutorials[0].featureName,
        permissionIndex: 0,
        stepIndex: 0,
        mode: 'chain',
        skipSeen: false,
      })
      setPendingNewPermissions([])
    }
  }, [featureTutorials])

  const nextStep = useCallback(() => {
    if (!active || !currentFeatureTutorial || !currentPermissionTutorial) return

    const stepsInCurrent = currentPermissionTutorial.steps.length

    if (active.stepIndex < stepsInCurrent - 1) {
      // Next step in current permission tutorial
      setActive((prev) => prev && { ...prev, stepIndex: prev.stepIndex + 1 })
    } else {
      // Current permission tutorial is done, mark as seen
      markPermissionSeen(currentPermissionTutorial.permission)

      if (active.mode === 'chain') {
        const onlyUnseen = active.skipSeen !== false
        let nextPi = active.permissionIndex + 1

        // Search within current feature first
        while (nextPi < currentFeatureTutorial.permissionTutorials.length) {
          if (!onlyUnseen || !permissionsSeen[currentFeatureTutorial.permissionTutorials[nextPi].permission]) {
            setActive({
              featureName: currentFeatureTutorial.featureName,
              permissionIndex: nextPi,
              stepIndex: 0,
              mode: 'chain',
              skipSeen: active.skipSeen,
            })
            return
          }
          nextPi++
        }

        // Search in subsequent features
        const featureIdx = featureTutorials.indexOf(currentFeatureTutorial)
        for (let fi = featureIdx + 1; fi < featureTutorials.length; fi++) {
          const ft = featureTutorials[fi]
          const matchIdx = onlyUnseen
            ? ft.permissionTutorials.findIndex((pt) => !permissionsSeen[pt.permission])
            : 0
          if (matchIdx >= 0 && ft.permissionTutorials.length > 0) {
            setActive({
              featureName: ft.featureName,
              permissionIndex: matchIdx,
              stepIndex: 0,
              mode: 'chain',
              skipSeen: active.skipSeen,
            })
            return
          }
        }

        // No more tutorials
        setActive(null)
      } else {
        // Single mode: done
        setActive(null)
      }
    }
  }, [active, currentFeatureTutorial, currentPermissionTutorial, featureTutorials, permissionsSeen, markPermissionSeen])

  const prevStep = useCallback(() => {
    if (!active) return
    if (active.stepIndex > 0) {
      setActive((prev) => prev && { ...prev, stepIndex: prev.stepIndex - 1 })
    }
  }, [active])

  const skipCurrent = useCallback(() => {
    if (!active || !currentPermissionTutorial) return
    markPermissionSeen(currentPermissionTutorial.permission)

    if (active.mode === 'chain' && currentFeatureTutorial) {
      const onlyUnseen = active.skipSeen !== false
      // Move to next permission tutorial
      let nextPi = active.permissionIndex + 1

      while (nextPi < currentFeatureTutorial.permissionTutorials.length) {
        if (!onlyUnseen || !permissionsSeen[currentFeatureTutorial.permissionTutorials[nextPi].permission]) {
          setActive({
            featureName: active.featureName,
            permissionIndex: nextPi,
            stepIndex: 0,
            mode: 'chain',
            skipSeen: active.skipSeen,
          })
          return
        }
        nextPi++
      }

      // Search in subsequent features
      const featureIdx = featureTutorials.indexOf(currentFeatureTutorial)
      for (let fi = featureIdx + 1; fi < featureTutorials.length; fi++) {
        const ft = featureTutorials[fi]
        const matchIdx = onlyUnseen
          ? ft.permissionTutorials.findIndex((pt) => !permissionsSeen[pt.permission])
          : 0
        if (matchIdx >= 0 && ft.permissionTutorials.length > 0) {
          setActive({
            featureName: ft.featureName,
            permissionIndex: matchIdx,
            stepIndex: 0,
            mode: 'chain',
            skipSeen: active.skipSeen,
          })
          return
        }
      }
    }
    setActive(null)
  }, [active, currentPermissionTutorial, currentFeatureTutorial, featureTutorials, permissionsSeen, markPermissionSeen])

  const skipAll = useCallback(() => {
    if (!active || !currentFeatureTutorial) return
    // Mark all remaining unseen permissions in the CURRENT feature as seen
    for (const pt of currentFeatureTutorial.permissionTutorials) {
      if (!permissionsSeen[pt.permission]) {
        markPermissionSeen(pt.permission)
      }
    }
    setActive(null)
  }, [active, currentFeatureTutorial, permissionsSeen, markPermissionSeen])

  const closeTutorial = useCallback(() => {
    setActive(null)
  }, [])

  const resetAll = useCallback(async () => {
    setPermissionsSeen({})
    setPendingDismissed(false)
    sessionStorage.removeItem('tutorial_pending_dismissed')
    try {
      await api.delete('/preference/didacticiel/seen')
    } catch {
      // Already cleared locally
    }
  }, [])

  const dismissPending = useCallback(() => {
    setPendingDismissed(true)
    setPendingNewPermissions([])
    if (hasConsent('functional')) {
      sessionStorage.setItem('tutorial_pending_dismissed', 'true')
    }
  }, [])

  const contextValue = useMemo(() => ({
    featureTutorials,
    permissionsSeen,
    active,
    currentStep,
    currentPermissionTutorial,
    currentFeatureTutorial,
    totalStepsInChain,
    currentStepInChain,
    startFeatureTutorial,
    startPermissionTutorial,
    startUnseenTutorials,
    startAllTutorials,
    nextStep,
    prevStep,
    skipCurrent,
    skipAll,
    closeTutorial,
    markPermissionSeen,
    resetAll,
    pendingNewPermissions,
    dismissPending,
  }), [
    featureTutorials, permissionsSeen, active,
    currentStep, currentPermissionTutorial, currentFeatureTutorial,
    totalStepsInChain, currentStepInChain,
    startFeatureTutorial, startPermissionTutorial, startUnseenTutorials, startAllTutorials,
    nextStep, prevStep, skipCurrent, skipAll,
    closeTutorial, markPermissionSeen, resetAll,
    pendingNewPermissions, dismissPending,
  ])

  return (
    <TutorialContext.Provider value={contextValue}>
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
