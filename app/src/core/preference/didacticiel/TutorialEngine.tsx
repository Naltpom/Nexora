import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTutorial } from './TutorialContext'
import './didacticiel.scss'

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

const TOOLTIP_HEIGHT_ESTIMATE = 200
const MOBILE_BREAKPOINT = 640
const TOOLTIP_BOTTOM_SHEET_HEIGHT = 220

function waitForElement(selector: string, timeout = 5000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) {
      resolve(el)
      return
    }
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector)
      if (found) {
        observer.disconnect()
        resolve(found)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)
  })
}

/**
 * Scroll the element into view if not already visible.
 * The tooltip handles its own clamping so we only need the element on screen.
 */
function scrollTargetIntoView(el: Element) {
  const rect = el.getBoundingClientRect()
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT
  const gap = 16

  if (isMobile) {
    const availableHeight = window.innerHeight - TOOLTIP_BOTTOM_SHEET_HEIGHT
    if (rect.top < gap || rect.bottom > availableHeight) {
      const targetY = window.scrollY + rect.top - gap - 60
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
    }
    return
  }

  // Desktop: if element top isn't visible, scroll to align it near the top
  if (rect.top < gap || rect.top > window.innerHeight - gap) {
    window.scrollBy({ top: rect.top - gap, behavior: 'smooth' })
  }
}

/** Clamp a top value so the tooltip stays within the viewport. */
function clampTop(top: number, vh: number, gap: number): number {
  return Math.max(gap, Math.min(top, vh - TOOLTIP_HEIGHT_ESTIMATE - gap))
}

export default function TutorialEngine() {
  const {
    active,
    currentStep,
    currentPermissionTutorial,
    totalStepsInChain,
    currentStepInChain,
    nextStep,
    prevStep,
    skipCurrent,
    skipAll,
    closeTutorial,
  } = useTutorial()

  const navigate = useNavigate()
  const location = useLocation()
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [waiting, setWaiting] = useState(false)
  const [elementNotFound, setElementNotFound] = useState(false)
  const [ready, setReady] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(currentStep.target)
    if (!el) {
      setTargetRect(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    })
  }, [currentStep])

  // Handle navigation and element discovery on step change
  useEffect(() => {
    if (!active || !currentStep) return

    let cancelled = false

    // Reset ready state immediately so nothing flickers
    setReady(false)
    setTargetRect(null)

    const resolveStep = async () => {
      // Navigate if needed
      if (currentStep.navigateTo && location.pathname !== currentStep.navigateTo) {
        setWaiting(true)
        setElementNotFound(false)
        navigate(currentStep.navigateTo)

        const delay = currentStep.delay ?? 500
        await new Promise((r) => setTimeout(r, delay))
      }

      if (cancelled) return

      // Wait for element to appear
      setWaiting(true)
      setElementNotFound(false)
      const el = await waitForElement(currentStep.target)

      if (cancelled) return
      setWaiting(false)

      if (el) {
        setElementNotFound(false)

        // Scroll element into view if not visible
        scrollTargetIntoView(el)

        // Wait for scroll to settle, then measure position
        await new Promise((r) => setTimeout(r, 400))
        if (cancelled) return

        // Measure final position
        const rect = el.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })

        // Now show everything
        setReady(true)
      } else {
        setElementNotFound(true)
        setTargetRect(null)
        setReady(true)
      }
    }

    resolveStep()
    return () => {
      cancelled = true
    }
  }, [active?.featureName, active?.permissionIndex, active?.stepIndex])

  // Keep position updated on resize/scroll
  useEffect(() => {
    if (!active || !ready) return
    const onUpdate = () => updatePosition()
    window.addEventListener('resize', onUpdate)
    window.addEventListener('scroll', onUpdate, true)
    return () => {
      window.removeEventListener('resize', onUpdate)
      window.removeEventListener('scroll', onUpdate, true)
    }
  }, [updatePosition, active, ready])

  if (location.pathname === '/accept-legal' || location.pathname === '/change-password') return null
  if (!active || !currentStep) return null

  // Show only the dark overlay while loading (no tooltip, no highlight)
  if (!ready) {
    return createPortal(
      <div className="tutorial-overlay">
        <svg className="tutorial-overlay-svg">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.5)"
          />
        </svg>
        {waiting && (
          <div className="tutorial-waiting">
            <div className="tutorial-waiting__spinner" />
          </div>
        )}
      </div>,
      document.body
    )
  }

  const isFirst = active.stepIndex === 0
  const isLastInPermission =
    currentPermissionTutorial &&
    active.stepIndex === currentPermissionTutorial.steps.length - 1
  const padding = 8
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT

  const getTooltipInlinePosition = (): React.CSSProperties | undefined => {
    // Mobile: bottom sheet — CSS handles it
    if (isMobile) return undefined
    if (!targetRect || elementNotFound) return undefined

    const pos = currentStep.position || 'auto'
    const gap = 16
    const vh = window.innerHeight
    const vw = window.innerWidth

    let finalPos = pos
    if (pos === 'auto') {
      const spaceBelow = vh - (targetRect.top + targetRect.height)
      const spaceAbove = targetRect.top
      const spaceRight = vw - (targetRect.left + targetRect.width)
      const spaceLeft = targetRect.left

      if (spaceBelow >= 200) finalPos = 'bottom'
      else if (spaceAbove >= 200) finalPos = 'top'
      else if (spaceRight >= 320) finalPos = 'right'
      else if (spaceLeft >= 320) finalPos = 'left'
      else finalPos = 'bottom'
    }

    // Horizontal centering relative to target, clamped to viewport
    const centeredLeft = Math.max(
      gap,
      Math.min(vw - 356, targetRect.left + targetRect.width / 2 - 170)
    )

    switch (finalPos) {
      case 'bottom': {
        const idealTop = targetRect.top + targetRect.height + padding + gap
        return { top: clampTop(idealTop, vh, gap), left: centeredLeft }
      }
      case 'top': {
        // Position above element; compute as top value and clamp
        const idealTop = targetRect.top - padding - gap - TOOLTIP_HEIGHT_ESTIMATE
        return { top: clampTop(idealTop, vh, gap), left: centeredLeft }
      }
      case 'right': {
        const idealTop = targetRect.top + targetRect.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2
        return {
          top: clampTop(idealTop, vh, gap),
          left: targetRect.left + targetRect.width + padding + gap,
        }
      }
      case 'left': {
        const idealTop = targetRect.top + targetRect.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2
        return {
          top: clampTop(idealTop, vh, gap),
          right: vw - targetRect.left + padding + gap,
        }
      }
      default: {
        const idealTop = targetRect.top + targetRect.height + padding + gap
        return { top: clampTop(idealTop, vh, gap), left: centeredLeft }
      }
    }
  }

  const tooltipPositionClass = (() => {
    if (isMobile) return 'tutorial-tooltip--mobile'
    if (!targetRect || elementNotFound) return 'tutorial-tooltip--centered'
    return ''
  })()

  return createPortal(
    <div
      className="tutorial-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeTutorial()
      }}
    >
      {/* SVG mask overlay */}
      <svg className="tutorial-overlay-svg">
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && !elementNotFound && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Highlight ring */}
      {targetRect && !elementNotFound && (
        <div
          className="tutorial-highlight"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className={`tutorial-tooltip tutorial-tooltip--visible ${tooltipPositionClass}`}
        style={getTooltipInlinePosition()}
        ref={tooltipRef}
      >
        <div className="tutorial-tooltip-header">
          <span className="tutorial-tooltip-step">
            {currentStepInChain} / {totalStepsInChain}
          </span>
          {currentPermissionTutorial && (
            <span className="tutorial-tooltip-label">
              {currentPermissionTutorial.label}
            </span>
          )}
          <button
            className="tutorial-tooltip-close"
            onClick={closeTutorial}
            type="button"
          >
            &times;
          </button>
        </div>
        <h3 className="tutorial-tooltip-title">
          {elementNotFound ? 'Element introuvable' : currentStep.title}
        </h3>
        <p className="tutorial-tooltip-desc">
          {elementNotFound
            ? "L'element cible n'a pas ete trouve sur cette page. Passez a l'etape suivante."
            : currentStep.description}
        </p>
        <div className="tutorial-tooltip-actions">
          {!isFirst && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={prevStep}
              type="button"
            >
              Precedent
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={nextStep}
            type="button"
          >
            {isLastInPermission && active.mode === 'single'
              ? 'Terminer'
              : 'Suivant'}
          </button>
          {active.mode === 'chain' && (
            <button
              className="tutorial-tooltip-skip"
              onClick={skipAll}
              type="button"
            >
              Tout passer
            </button>
          )}
          {active.mode === 'single' && !isLastInPermission && (
            <button
              className="tutorial-tooltip-skip"
              onClick={skipCurrent}
              type="button"
            >
              Passer
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
