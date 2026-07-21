'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

import styles from './FestivalEffect.module.css'

const effectClasses = {
  LUNAR_NEW_YEAR: styles.tet,
  CHRISTMAS: styles.snow,
  NEW_YEAR: styles.confetti,
  VALENTINE: styles.valentine,
  SUMMER: styles.summer,
}
const particleCounts = { Low: 12, Medium: 20, High: 30 }
const emptySubscribe = () => () => {}

function subscribeToVisibility(onStoreChange) {
  document.addEventListener('visibilitychange', onStoreChange)
  return () => document.removeEventListener('visibilitychange', onStoreChange)
}

function subscribeToMotion(onStoreChange) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function subscribeToPlayed(onStoreChange) {
  window.addEventListener('festival-effect-played', onStoreChange)
  return () => window.removeEventListener('festival-effect-played', onStoreChange)
}

export default function FestivalEffect({ config }) {
  const pathname = usePathname()
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const isVisibleTab = useSyncExternalStore(subscribeToVisibility, () => document.visibilityState === 'visible', () => true)
  const reduceMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => true)
  const playKey = config?.effect === 'NEW_YEAR' ? `festival-effect:${config.effect}:${config.updatedAt}` : ''
  const alreadyPlayed = useSyncExternalStore(
    subscribeToPlayed,
    () => Boolean(playKey && window.sessionStorage.getItem(playKey)),
    () => false,
  )

  useEffect(() => {
    if (!hydrated || !playKey || alreadyPlayed || reduceMotion) return undefined
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(playKey, 'played')
      window.dispatchEvent(new Event('festival-effect-played'))
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [alreadyPlayed, hydrated, playKey, reduceMotion])

  const isPublicRoute = !pathname?.startsWith('/admin') && !pathname?.startsWith('/driver')
  const effectClass = effectClasses[config?.effect]
  if (!hydrated || !config || !effectClass || !isPublicRoute || reduceMotion || alreadyPlayed) return null

  const count = particleCounts[config.intensity] || particleCounts.Medium

  return (
    <div className={`${styles.overlay} ${isVisibleTab ? '' : styles.paused}`} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={`${styles.particle} ${effectClass} ${styles[`variant${index % 4}`] || ''}`}
          style={{
            '--festival-left': `${(index * 37 + 11) % 101}%`,
            '--festival-size': `${6 + (index % 4) * 2}px`,
            '--festival-duration': `${8 + (index * 7) % 9}s`,
            '--festival-delay': `${-((index * 1.17) % 12)}s`,
            '--festival-drift': `${-70 + (index * 43) % 141}px`,
            '--festival-rotation': `${360 + (index % 4) * 180}deg`,
          }}
        />
      ))}
    </div>
  )
}
