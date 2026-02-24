import './backgrounds.scss'
import { useDarkMode } from './useDarkMode'

export default function NoiseGradientBg() {
  const isDark = useDarkMode()

  const gradient = isDark
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)'
    : 'linear-gradient(135deg, #fef9ef 0%, #fde8e8 30%, #e8f4fd 60%, #fef9ef 100%)'

  return (
    <div className="bg-container">
      <div
        className="bg-layer"
        style={{
          background: gradient,
          backgroundSize: '400% 400%',
          animation: 'breathingGradient 20s ease infinite',
        }}
      />
      <svg className="noise-svg-filter">
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
      </svg>
      <div
        className="noise-overlay"
        style={{
          opacity: isDark ? 0.12 : 0.08,
        }}
      />
    </div>
  )
}
