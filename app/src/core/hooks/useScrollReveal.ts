import { useCallback, useRef } from 'react'

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  once?: boolean
  stagger?: boolean
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollRevealOptions = {}
) {
  const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', once = true, stagger = false } = options
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Cleanup happens in the callback ref itself (called with null on unmount).
  // No useEffect cleanup — avoids StrictMode double-mount breaking the observer.
  const ref = useCallback((element: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (!element) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      element.classList.add('revealed')
      return
    }

    if (stagger) {
      const children = element.querySelectorAll('.reveal-child')
      children.forEach((child, index) => {
        ;(child as HTMLElement).style.setProperty('--reveal-index', String(index))
      })
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            if (once) {
              observer.unobserve(entry.target)
            }
          } else if (!once) {
            entry.target.classList.remove('revealed')
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(element)
    observerRef.current = observer
  }, [threshold, rootMargin, once, stagger])

  return ref
}
