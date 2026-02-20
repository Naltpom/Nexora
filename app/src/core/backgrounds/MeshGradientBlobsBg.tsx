import './backgrounds.scss'
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
      className="mesh-bg-container"
      style={{ background: bg }}
    >
      {blobs.map((blob, i) => (
        <div
          key={i}
          className="mesh-blob"
          style={{
            width: blob.size,
            height: blob.size,
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            animation: `${blob.anim} ${18 + i * 3}s ease-in-out infinite`,
            top: blob.top,
            bottom: blob.bottom,
            left: blob.left,
            right: blob.right,
          }}
        />
      ))}
    </div>
  )
}
