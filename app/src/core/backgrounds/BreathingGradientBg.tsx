import { useDarkMode } from './useDarkMode'

export default function BreathingGradientBg() {
  const isDark = useDarkMode()

  const gradient = isDark
    ? 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c, #4facfe, #667eea)'
    : 'linear-gradient(135deg, #a8b8ff, #c9a0e0, #f9cdf0, #ffb3bf, #b0daff, #a8b8ff)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: gradient,
          backgroundSize: '400% 400%',
          animation: 'breathingGradient 12s ease infinite',
        }}
      />

      {!isDark && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.25)',
          }}
        />
      )}

      <style>{`
        @keyframes breathingGradient {
          0% { background-position: 0% 50%; }
          25% { background-position: 50% 100%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 0%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}
