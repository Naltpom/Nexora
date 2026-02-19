import { useState, useEffect } from 'react'
import BreathingGradientBg from './backgrounds/BreathingGradientBg'
import FloatingParticlesBg from './backgrounds/FloatingParticlesBg'
import RotatingHueBg from './backgrounds/RotatingHueBg'
import MeshGradientBlobsBg from './backgrounds/MeshGradientBlobsBg'

function getVariant(): number {
  const attr = document.documentElement.getAttribute('data-bg-theme')
  const n = parseInt(attr || '4', 10)
  return [1, 2, 3, 4].includes(n) ? n : 4
}

export default function MeshBackground() {
  const [variant, setVariant] = useState(getVariant)

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setVariant(getVariant())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bg-theme'],
    })
    return () => observer.disconnect()
  }, [])

  switch (variant) {
    case 1: return <BreathingGradientBg />
    case 2: return <FloatingParticlesBg />
    case 3: return <RotatingHueBg />
    case 4:
    default: return <MeshGradientBlobsBg />
  }
}
