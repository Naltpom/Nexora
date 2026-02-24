import './backgrounds.scss'
import { useDarkMode } from './useDarkMode'

export default function NeonGridBg() {
  const isDark = useDarkMode()

  const bg = isDark ? '#0a0a14' : '#f8faff'
  const lineColor = isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)'
  const glowColor = isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.12)'

  return (
    <div className="bg-container" style={{ background: bg }}>
      <div
        className="neon-grid-layer"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, ${lineColor} 0px, ${lineColor} 1px, transparent 1px, transparent 60px),
            repeating-linear-gradient(90deg, ${lineColor} 0px, ${lineColor} 1px, transparent 1px, transparent 60px)
          `,
        }}
      />
      <div
        className="neon-grid-glow"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${glowColor}, transparent 70%)`,
          animation: 'gridPulse 6s ease-in-out infinite',
        }}
      />
    </div>
  )
}
