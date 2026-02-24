import './backgrounds.scss'
import { useDarkMode } from './useDarkMode'

export default function AuroraBg() {
  const isDark = useDarkMode()

  const bg = isDark ? '#0a0a18' : '#eef2ff'

  const orbs = isDark
    ? [
        { color: 'rgba(139, 92, 246, 0.5)', shadow: '0 0 80px 80px rgba(139,92,246,0.35)', anim: 'auroraOrb1', size: '1px', top: '20%', left: '25%' },
        { color: 'rgba(59, 130, 246, 0.45)', shadow: '0 0 90px 90px rgba(59,130,246,0.3)', anim: 'auroraOrb2', size: '1px', top: '50%', left: '60%' },
        { color: 'rgba(236, 72, 153, 0.4)', shadow: '0 0 70px 70px rgba(236,72,153,0.25)', anim: 'auroraOrb3', size: '1px', top: '70%', left: '35%' },
      ]
    : [
        { color: 'rgba(139, 92, 246, 0.25)', shadow: '0 0 80px 80px rgba(139,92,246,0.18)', anim: 'auroraOrb1', size: '1px', top: '20%', left: '25%' },
        { color: 'rgba(59, 130, 246, 0.22)', shadow: '0 0 90px 90px rgba(59,130,246,0.15)', anim: 'auroraOrb2', size: '1px', top: '50%', left: '60%' },
        { color: 'rgba(236, 72, 153, 0.2)', shadow: '0 0 70px 70px rgba(236,72,153,0.12)', anim: 'auroraOrb3', size: '1px', top: '70%', left: '35%' },
      ]

  return (
    <div className="bg-container" style={{ background: bg }}>
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="aurora-orb"
          style={{
            background: orb.color,
            boxShadow: orb.shadow,
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            animation: `${orb.anim} ${22 + i * 5}s ease-in-out infinite, auroraHue ${15 + i * 5}s linear infinite`,
          }}
        />
      ))}
    </div>
  )
}
