import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTutorial } from './TutorialContext'
import './didacticiel.scss'

interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

export default function TutorialEngine() {
  const { activeTutorial, activeStepIndex, nextStep, prevStep, skipTutorial } = useTutorial()
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!activeTutorial) {
      setTargetRect(null)
      return
    }
    const step = activeTutorial.steps[activeStepIndex]
    if (!step) return

    const el = document.querySelector(step.target)
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
  }, [activeTutorial, activeStepIndex])

  // Scroll target into view on step change
  useEffect(() => {
    if (!activeTutorial) return
    const step = activeTutorial.steps[activeStepIndex]
    if (!step) return

    const el = document.querySelector(step.target)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      // Update position after scroll settles
      const timer = setTimeout(updatePosition, 300)
      return () => clearTimeout(timer)
    }
  }, [activeTutorial, activeStepIndex])

  useEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition])

  if (!activeTutorial) return null

  const step = activeTutorial.steps[activeStepIndex]
  const totalSteps = activeTutorial.steps.length
  const isFirst = activeStepIndex === 0
  const isLast = activeStepIndex === totalSteps - 1
  const padding = 8

  const getTooltipStyle = (): React.CSSProperties | undefined => {
    if (!targetRect) {
      return undefined
    }

    const pos = step.position || 'auto'
    const margin = 16

    let finalPos = pos
    if (pos === 'auto') {
      const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height)
      const spaceAbove = targetRect.top
      const spaceRight = window.innerWidth - (targetRect.left + targetRect.width)
      const spaceLeft = targetRect.left

      if (spaceBelow >= 200) finalPos = 'bottom'
      else if (spaceAbove >= 200) finalPos = 'top'
      else if (spaceRight >= 320) finalPos = 'right'
      else if (spaceLeft >= 320) finalPos = 'left'
      else finalPos = 'bottom'
    }

    switch (finalPos) {
      case 'bottom':
        return {
          top: targetRect.top + targetRect.height + padding + margin,
          left: Math.max(16, Math.min(
            window.innerWidth - 356,
            targetRect.left + targetRect.width / 2 - 170,
          )),
        }
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + padding + margin,
          left: Math.max(16, Math.min(
            window.innerWidth - 356,
            targetRect.left + targetRect.width / 2 - 170,
          )),
        }
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left + targetRect.width + padding + margin,
          transform: 'translateY(-50%)',
        }
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + padding + margin,
          transform: 'translateY(-50%)',
        }
      default:
        return {
          top: targetRect.top + targetRect.height + padding + margin,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        }
    }
  }

  return createPortal(
    <div className="tutorial-overlay" onClick={(e) => { if (e.target === e.currentTarget) skipTutorial() }}>
      {/* SVG mask overlay */}
      <svg className="tutorial-overlay-svg">
        <defs>
          <mask id="tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
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
          x="0" y="0"
          width="100%" height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tutorial-mask)"
        />
      </svg>

      {/* Highlight ring */}
      {targetRect && (
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
      <div className={`tutorial-tooltip${!targetRect ? ' tutorial-tooltip-centered' : ''}`} style={getTooltipStyle()} ref={tooltipRef}>
        <div className="tutorial-tooltip-header">
          <span className="tutorial-tooltip-step">{activeStepIndex + 1} / {totalSteps}</span>
          <button className="tutorial-tooltip-close" onClick={skipTutorial} type="button">&times;</button>
        </div>
        <h3 className="tutorial-tooltip-title">{step.title}</h3>
        <p className="tutorial-tooltip-desc">{step.description}</p>
        <div className="tutorial-tooltip-actions">
          {!isFirst && (
            <button className="btn btn-secondary btn-sm" onClick={prevStep} type="button">
              Precedent
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={nextStep} type="button">
            {isLast ? 'Terminer' : 'Suivant'}
          </button>
          {!isLast && (
            <button className="tutorial-tooltip-skip" onClick={skipTutorial} type="button">
              Passer
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
