'use client'

import { useEffect } from 'react'

export default function HomeMotionController() {
  useEffect(() => {
    const root = document.documentElement
    const targets = Array.from(document.querySelectorAll('[data-home-reveal]'))
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-home-visible'))
      return undefined
    }

    const revealLine = window.innerHeight * 0.92
    const pendingTargets = []

    targets.forEach((target) => {
      if (target.getBoundingClientRect().top < revealLine) {
        target.classList.add('is-home-visible')
      } else {
        pendingTargets.push(target)
      }
    })

    root.classList.add('home-motion-active')

    const pending = new Set(pendingTargets)
    let animationFrame = null
    let observer = null

    function stopViewportChecks() {
      window.removeEventListener('scroll', scheduleViewportCheck)
      window.removeEventListener('resize', scheduleViewportCheck)
    }

    function revealTarget(target) {
      target.classList.add('is-home-visible')
      pending.delete(target)
      observer?.unobserve(target)
      if (!pending.size) stopViewportChecks()
    }

    function checkPassedTargets() {
      animationFrame = null
      const currentRevealLine = window.innerHeight * 0.92

      pending.forEach((target) => {
        if (target.getBoundingClientRect().top < currentRevealLine) revealTarget(target)
      })
    }

    function scheduleViewportCheck() {
      if (animationFrame !== null) return
      animationFrame = window.requestAnimationFrame(checkPassedTargets)
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const passedViewport = entry.boundingClientRect.top < 0
        if (!entry.isIntersecting && !passedViewport) return
        revealTarget(entry.target)
      })
    }, {
      rootMargin: '0px 0px -9% 0px',
      threshold: 0.08,
    })

    pendingTargets.forEach((target) => observer.observe(target))
    window.addEventListener('scroll', scheduleViewportCheck, { passive: true })
    window.addEventListener('resize', scheduleViewportCheck, { passive: true })

    return () => {
      observer.disconnect()
      stopViewportChecks()
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      root.classList.remove('home-motion-active')
    }
  }, [])

  return null
}
