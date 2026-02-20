import './backgrounds.scss'
import { useDarkMode } from './useDarkMode'

export default function BreathingGradientBg() {
  const isDark = useDarkMode()

  const gradient = isDark
    ? 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #667eea)'
    : 'linear-gradient(135deg, #a8b8ff, #c9a0e0, #f9cdf0, #ffb3bf, #b0daff, #a8b8ff)'

  return (
    <div className="bg-container">
      <div
        className="bg-layer"
        style={{
          background: gradient,
          backgroundSize: '400% 400%',
          animation: 'breathingGradient 12s ease infinite',
        }}
      />

      {!isDark && (
        <div className="bg-light-overlay" />
      )}
    </div>
  )
}
