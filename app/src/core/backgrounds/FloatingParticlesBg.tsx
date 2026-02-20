import './backgrounds.scss'
import { useEffect, useRef } from 'react'
import { useDarkMode } from './useDarkMode'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  hue: number
}

export default function FloatingParticlesBg() {
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
    const particles: Particle[] = []
    const count = 50

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 60 + 20,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.15 + 0.05,
        hue: Math.random() * 60 + 200,
      })
    }

    const animate = () => {
      const dark = darkRef.current
      ctx.fillStyle = dark ? '#0f0f1a' : '#f0f0fa'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.speedX
        p.y += p.speedY

        if (p.x < -p.size) p.x = canvas.width + p.size
        if (p.x > canvas.width + p.size) p.x = -p.size
        if (p.y < -p.size) p.y = canvas.height + p.size
        if (p.y > canvas.height + p.size) p.y = -p.size

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        const lightness = dark ? '60%' : '45%'
        const opacity = dark ? p.opacity : p.opacity * 2.5
        gradient.addColorStop(0, `hsla(${p.hue}, 80%, ${lightness}, ${opacity})`)
        gradient.addColorStop(1, `hsla(${p.hue}, 80%, ${lightness}, 0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })

      animId = requestAnimationFrame(animate)
    }
    animate()

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
