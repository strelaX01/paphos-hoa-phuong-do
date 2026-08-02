'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

import styles from './FestivalEffect.module.css'

const EFFECT_CLASSES = {
  LUNAR_NEW_YEAR: styles.tet,
  CHRISTMAS: styles.snow,
  NEW_YEAR: styles.confetti,
  VALENTINE: styles.valentine,
  SUMMER: styles.summer,
}

const PREVIEW_EFFECTS = {
  tet: 'LUNAR_NEW_YEAR',
  christmas: 'CHRISTMAS',
  'new-year': 'NEW_YEAR',
  valentine: 'VALENTINE',
  summer: 'SUMMER',
}

const PARTICLE_COUNTS = {
  desktop: { Low: 10, Medium: 16, High: 24 },
  mobile: { Low: 4, Medium: 7, High: 9 },
  constrained: { Low: 3, Medium: 5, High: 6 },
}

const PREVIEW_COUNTS = { Low: 5, Medium: 8, High: 11 }
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

function subscribeToPerformanceProfile(onStoreChange) {
  const media = window.matchMedia('(max-width: 768px)')
  const connection = navigator.connection
  media.addEventListener('change', onStoreChange)
  connection?.addEventListener?.('change', onStoreChange)
  return () => {
    media.removeEventListener('change', onStoreChange)
    connection?.removeEventListener?.('change', onStoreChange)
  }
}

function getPerformanceProfile() {
  const saveData = Boolean(navigator.connection?.saveData)
  const lowMemory = Number(navigator.deviceMemory || 8) <= 4
  const lowCpu = Number(navigator.hardwareConcurrency || 8) <= 4
  if (saveData || (lowMemory && lowCpu)) return 'constrained'
  return window.matchMedia('(max-width: 768px)').matches || lowMemory || lowCpu ? 'mobile' : 'desktop'
}

function subscribeToPlayed(onStoreChange) {
  window.addEventListener('festival-effect-played', onStoreChange)
  return () => window.removeEventListener('festival-effect-played', onStoreChange)
}

function particleStyle(index, effect, preview) {
  const drift = -72 + (index * 43) % 145
  const burstX = -46 + (index * 29) % 93
  const previewScale = preview ? 0.85 : 1
  const baseSize = effect === 'CHRISTMAS' ? 5 : effect === 'VALENTINE' ? 8 : 7

  return {
    '--festival-left': `${(index * 37 + 11) % 101}%`,
    '--festival-static-top': `${12 + (index * 23) % 76}%`,
    '--festival-size': `${Math.round((baseSize + (index % 4) * 2) * previewScale)}px`,
    '--festival-duration': `${effect === 'NEW_YEAR' ? 4.8 : 9 + (index * 7) % 8}s`,
    '--festival-delay': effect === 'NEW_YEAR' ? `${(index % 6) * 0.08}s` : `${-((index * 1.17) % 12)}s`,
    '--festival-drift': `${preview ? Math.round(drift * 0.55) : drift}px`,
    '--festival-mid-drift': `${preview ? Math.round(drift * -0.22) : Math.round(drift * -0.45)}px`,
    '--festival-small-drift': `${preview ? Math.round(drift * 0.16) : Math.round(drift * 0.28)}px`,
    '--festival-rotation': `${300 + (index % 5) * 150}deg`,
    '--festival-travel': preview ? '520px' : '124vh',
    '--festival-travel-one': preview ? '180px' : '42vh',
    '--festival-travel-two': preview ? '370px' : '88vh',
    '--festival-rise': preview ? '-520px' : '-124vh',
    '--festival-rise-one': preview ? '-210px' : '-52vh',
    '--festival-rise-two': preview ? '-390px' : '-92vh',
    '--festival-burst-x': preview ? `${Math.round(burstX * 3.1)}px` : `${burstX}vw`,
    '--festival-burst-mid-x': preview ? `${Math.round(burstX * 1.15)}px` : `${Math.round(burstX * 0.38)}vw`,
    '--festival-burst-y': preview ? `${-75 - (index % 4) * 18}px` : `${-22 - (index % 4) * 7}vh`,
    '--festival-burst-start': preview ? '250px' : '56vh',
    '--festival-burst-end': preview ? '290px' : '66vh',
  }
}

function ParticleLayer({ count, effect, paused, preview = false, reduced = false }) {
  const effectClass = EFFECT_CLASSES[effect]
  if (!effectClass) return null

  return (
    <div
      key={effect}
      className={`${preview ? styles.previewOverlay : styles.overlay} ${paused ? styles.paused : ''} ${reduced ? styles.reduced : ''}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={`${styles.particle} ${effectClass} ${styles[`variant${index % 4}`] || ''}`}
          style={particleStyle(index, effect, preview)}
        />
      ))}
    </div>
  )
}

export function FestivalEffectPreview({ effect, intensity }) {
  const isVisibleTab = useSyncExternalStore(subscribeToVisibility, () => document.visibilityState === 'visible', () => true)
  const reduceMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => true)
  const normalizedEffect = PREVIEW_EFFECTS[effect]
  const count = reduceMotion ? 4 : PREVIEW_COUNTS[intensity] || PREVIEW_COUNTS.Medium

  return <ParticleLayer count={count} effect={normalizedEffect} paused={!isVisibleTab || reduceMotion} preview reduced={reduceMotion} />
}

export default function FestivalEffect({ config }) {
  const pathname = usePathname()
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const isVisibleTab = useSyncExternalStore(subscribeToVisibility, () => document.visibilityState === 'visible', () => true)
  const reduceMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => true)
  const performanceProfile = useSyncExternalStore(subscribeToPerformanceProfile, getPerformanceProfile, () => 'constrained')
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
  const effectClass = EFFECT_CLASSES[config?.effect]
  if (!hydrated || !config || !effectClass || !isPublicRoute || reduceMotion || alreadyPlayed) return null

  const profileCounts = PARTICLE_COUNTS[performanceProfile] || PARTICLE_COUNTS.mobile
  const count = profileCounts[config.intensity] || profileCounts.Medium

  return <ParticleLayer count={count} effect={config.effect} paused={!isVisibleTab} />
}
