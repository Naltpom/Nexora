import './backgrounds.scss'
import { useEffect, useRef } from 'react'
import { useDarkMode } from './useDarkMode'

interface Star {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
}

const CONNECTION_DISTANCE = 120
const STAR_COUNT = 80

export default function ConstellationsBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDark = useDarkMode()
  const darkRef = useRef(isDark)

  useEffect(() => {
    darkRef.current = isDark
  }, [isDark])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const stars: Star[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        opacity: Math.random() * 0.6 + 0.4,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      })
    }

    const animate = (time: number) => {
      const dark = darkRef.current
      ctx.fillStyle = dark ? '#08081a' : '#f0f2fa'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update positions
      stars.forEach(s => {
        s.x += s.speedX
        s.y += s.speedY
        if (s.x < -10) s.x = canvas.width + 10
        if (s.x > canvas.width + 10) s.x = -10
        if (s.y < -10) s.y = canvas.height + 10
        if (s.y > canvas.height + 10) s.y = -10
      })

      // Draw connections
      const lineBase = dark ? '180, 180, 255' : '80, 80, 180'
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x
          const dy = stars[i].y - stars[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * (dark ? 0.2 : 0.1)
            ctx.strokeStyle = `rgba(${lineBase}, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(stars[i].x, stars[i].y)
            ctx.lineTo(stars[j].x, stars[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw stars
      stars.forEach(s => {
        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinkleOffset) * 0.3 + 0.7
        const alpha = s.opacity * twinkle
        const color = dark
          ? `rgba(200, 210, 255, ${alpha})`
          : `rgba(80, 90, 160, ${alpha * 0.6})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })

      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <div className="bg-container">
      <canvas ref={canvasRef} className="bg-canvas" />
    </div>
  )
}
