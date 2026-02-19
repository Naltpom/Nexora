import { useEffect, useState } from 'react'
import { useDarkMode } from './useDarkMode'

export default function RotatingHueBg() {
  const [hue, setHue] = useState(0)
  const isDark = useDarkMode()

  useEffect(() => {
    let animId: number
    let start: number | null = null

    const animate = (timestamp: number) => {
      if (!start) start = timestamp
      const elapsed = timestamp - start
      setHue((elapsed / 30000) * 360 % 360)
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [])

  const hue2 = (hue + 60) % 360
  const hue3 = (hue + 180) % 360

  const lightness = isDark ? '50%' : '75%'
  const saturation = isDark ? '70%' : '60%'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, hsl(${hue}, ${saturation}, ${lightness}), hsl(${hue2}, ${saturation}, ${lightness}), hsl(${hue3}, ${saturation}, ${lightness}))`,
          transition: 'background 0.1s linear',
        }}
      />

      {!isDark && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.2)',
          }}
        />
      )}
    </div>
  )
}
