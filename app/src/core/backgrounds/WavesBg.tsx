import './backgrounds.scss'
import { useDarkMode } from './useDarkMode'

const WAVE_PATHS = [
  'M0,160 C320,220 640,100 960,160 C1280,220 1600,100 1920,160 L1920,320 L0,320 Z',
  'M0,200 C320,140 640,260 960,200 C1280,140 1600,260 1920,200 L1920,320 L0,320 Z',
  'M0,240 C320,280 640,200 960,240 C1280,280 1600,200 1920,240 L1920,320 L0,320 Z',
]

export default function WavesBg() {
  const isDark = useDarkMode()

  const bg = isDark ? '#0a0a18' : '#f0f4ff'

  const colors = isDark
    ? ['rgba(99,102,241,0.25)', 'rgba(139,92,246,0.2)', 'rgba(59,130,246,0.15)']
    : ['rgba(99,102,241,0.12)', 'rgba(139,92,246,0.1)', 'rgba(59,130,246,0.08)']

  return (
    <div className="bg-container" style={{ background: bg }}>
      {WAVE_PATHS.map((path, i) => (
        <div
          key={i}
          className="wave-layer"
          style={{
            bottom: 0,
            animation: `waveSlide${i + 1} ${12 + i * 4}s ease-in-out infinite`,
          }}
        >
          <svg
            viewBox="0 0 1920 320"
            preserveAspectRatio="none"
            className="wave-svg"
          >
            <path d={path} fill={colors[i]} />
          </svg>
        </div>
      ))}
    </div>
  )
}
