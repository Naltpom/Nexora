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

const TOTAL_VARIANTS = 9
const STORAGE_KEY = '_bg_deck'

function getVariant(): number {
  const attr = document.documentElement.getAttribute('data-bg-theme')
  const n = parseInt(attr || '4', 10)
  return n >= 1 && n <= TOTAL_VARIANTS ? n : 4
}

/** Shuffle array in-place (Fisher-Yates) */
function shuffle(arr: number[]): number[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Pick next background from a shuffled deck stored in sessionStorage.
 *  All 9 variants are shown before any repeats. */
function nextFromDeck(): number {
  let deck: number[] = []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) deck = JSON.parse(raw)
  } catch { /* ignore */ }

  if (!Array.isArray(deck) || deck.length === 0) {
    deck = shuffle(Array.from({ length: TOTAL_VARIANTS }, (_, i) => i + 1))
  }

  const picked = deck.shift()!
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(deck))
  return picked
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
    randomOnLoad ? nextFromDeck() : getVariant()
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
