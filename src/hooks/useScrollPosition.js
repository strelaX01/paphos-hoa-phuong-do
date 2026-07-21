// hooks/useScrollPosition.js
'use client'

import { useState, useEffect } from 'react'

/**
 * useScrollPosition — returns current scroll Y position
 * Used by Header for transparent → solid transition
 */
export function useScrollPosition(threshold = 20) {
  const [isPastThreshold, setIsPastThreshold] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsPastThreshold(window.scrollY > threshold)
    }

    // Check on mount
    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return isPastThreshold
}
