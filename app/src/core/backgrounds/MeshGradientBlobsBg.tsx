import { useDarkMode } from './useDarkMode'

const LIGHT_BLOBS = [
  { color: 'rgba(59, 130, 246, 0.15)', size: '50vmax', top: '-15%', left: '-10%', anim: 'meshBlob1' },
  { color: 'rgba(168, 85, 247, 0.12)', size: '45vmax', bottom: '-10%', right: '-5%', anim: 'meshBlob2' },
  { color: 'rgba(34, 197, 94, 0.10)', size: '40vmax', top: '25%', right: '15%', anim: 'meshBlob3' },
  { color: 'rgba(251, 146, 60, 0.08)', size: '35vmax', bottom: '15%', left: '10%', anim: 'meshBlob4' },
  { color: 'rgba(14, 165, 233, 0.08)', size: '30vmax', top: '10%', left: '35%', anim: 'meshBlob5' },
]

const DARK_BLOBS = [
  { color: 'rgba(102, 126, 234, 0.25)', size: '50vmax', top: '-15%', left: '-10%', anim: 'meshBlob1' },
  { color: 'rgba(240, 147, 251, 0.18)', size: '45vmax', bottom: '-10%', right: '-5%', anim: 'meshBlob2' },
  { color: 'rgba(79, 172, 254, 0.18)', size: '40vmax', top: '25%', right: '15%', anim: 'meshBlob3' },
  { color: 'rgba(245, 87, 108, 0.12)', size: '35vmax', bottom: '15%', left: '10%', anim: 'meshBlob4' },
  { color: 'rgba(52, 211, 153, 0.10)', size: '30vmax', top: '10%', left: '35%', anim: 'meshBlob5' },
]

export default function MeshGradientBlobsBg() {
  const isDark = useDarkMode()

  const blobs = isDark ? DARK_BLOBS : LIGHT_BLOBS
  const bg = isDark ? '#0a0a12' : '#f8fafc'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        background: bg,
        overflow: 'hidden',
        transition: 'background 0.5s ease',
      }}
    >
      {blobs.map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: blob.size,
            height: blob.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: `${blob.anim} ${18 + i * 3}s ease-in-out infinite`,
            top: blob.top,
            bottom: blob.bottom,
            left: blob.left,
            right: blob.right,
            transition: 'background 0.8s ease',
          }}
        />
      ))}

      <style>{`
        @keyframes meshBlob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(15vw, 12vh) scale(1.08); }
          50% { transform: translate(8vw, 25vh) scale(0.92); }
          75% { transform: translate(-5vw, 8vh) scale(1.04); }
        }
        @keyframes meshBlob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-12vw, -18vh) scale(1.12); }
          50% { transform: translate(-20vw, -4vh) scale(0.88); }
          75% { transform: translate(-8vw, -12vh) scale(1.06); }
        }
        @keyframes meshBlob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-16vw, 8vh) scale(1.08); }
          66% { transform: translate(4vw, -12vh) scale(0.94); }
        }
        @keyframes meshBlob4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          20% { transform: translate(12vw, -8vh) scale(1.04); }
          40% { transform: translate(20vw, 4vh) scale(0.92); }
          60% { transform: translate(8vw, 12vh) scale(1.1); }
          80% { transform: translate(-4vw, 4vh) scale(0.96); }
        }
        @keyframes meshBlob5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          30% { transform: translate(-8vw, 16vh) scale(1.08); }
          60% { transform: translate(12vw, -8vh) scale(0.92); }
        }
      `}</style>
    </div>
  )
}
