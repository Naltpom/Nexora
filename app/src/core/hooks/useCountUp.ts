import { useState, useEffect, useRef, useCallback } from 'react'

interface UseCountUpOptions {
  duration?: number
  delay?: number
}

export function useCountUp(
  endValue: number,
  options: UseCountUpOptions = {}
): { value: number; ref: (node: HTMLElement | null) => void } {
  const { duration = 1200, delay = 0 } = options
  const [value, setValue] = useState(0)
  const elementRef = useRef<HTMLElement | null>(null)
  const hasAnimated = useRef(false)
  const prevEndValue = useRef(endValue)
  const rafRef = useRef<number | null>(null)

  const animate = useCallback((target: number) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setValue(target)
      return
    }

    const startTime = performance.now() + delay

    const tick = (now: number) => {
      const elapsed = now - startTime
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [duration, delay])

  // When endValue changes (e.g. stats loaded), re-animate
  useEffect(() => {
    if (endValue !== prevEndValue.current) {
      prevEndValue.current = endValue
      if (endValue > 0) {
        hasAnimated.current = false
      }
    }
  }, [endValue])

  // Try to start animation via IntersectionObserver or immediately
  useEffect(() => {
    if (hasAnimated.current || endValue === 0) return

    const element = elementRef.current
    if (!element) {
      // No DOM element attached — animate immediately
      hasAnimated.current = true
      animate(endValue)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          animate(endValue)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [endValue, animate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const ref = useCallback((node: HTMLElement | null) => {
    elementRef.current = node
  }, [])

  return { value, ref }
}
