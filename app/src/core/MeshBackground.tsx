import { useState, useEffect } from 'react'
import BreathingGradientBg from './backgrounds/BreathingGradientBg'
import FloatingParticlesBg from './backgrounds/FloatingParticlesBg'
import RotatingHueBg from './backgrounds/RotatingHueBg'
import MeshGradientBlobsBg from './backgrounds/MeshGradientBlobsBg'
import AuroraBg from './backgrounds/AuroraBg'
import WavesBg from './backgrounds/WavesBg'
import NoiseGradientBg from './backgrounds/NoiseGradientBg'
import NeonGridBg from './backgrounds/NeonGridBg'
import ConstellationsBg from './backgrounds/ConstellationsBg'

function getVariant(): number {
  const attr = document.documentElement.getAttribute('data-bg-theme')
  const n = parseInt(attr || '4', 10)
  return n >= 1 && n <= 9 ? n : 4
}

function renderVariant(variant: number) {
  switch (variant) {
    case 1: return <BreathingGradientBg />
    case 2: return <FloatingParticlesBg />
    case 3: return <RotatingHueBg />
    case 5: return <AuroraBg />
    case 6: return <WavesBg />
    case 7: return <NoiseGradientBg />
    case 8: return <NeonGridBg />
    case 9: return <ConstellationsBg />
    case 4:
    default: return <MeshGradientBlobsBg />
  }
}

interface MeshBackgroundProps {
  randomOnLoad?: boolean
}

export default function MeshBackground({ randomOnLoad }: MeshBackgroundProps) {
  const [variant, setVariant] = useState(() =>
    randomOnLoad ? 8 : getVariant()
  )

  useEffect(() => {
    if (randomOnLoad) return
    // Read current value immediately (handles login → preferences applied before observer attaches)
    setVariant(getVariant())
    const observer = new MutationObserver(() => {
      setVariant(getVariant())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bg-theme'],
    })
    return () => observer.disconnect()
  }, [randomOnLoad])

  return renderVariant(variant)
}
