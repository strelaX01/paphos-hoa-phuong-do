'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import CategoryScroller from '@/app/components/shared/CategoryScroller'

export default function MenuNav({ categoryLinks }) {
  const [activeId, setActiveId] = useState(() => categoryLinks[0]?.href.replace('#', '') || '')
  const sectionRef = useRef(null)
  const navigationTargetRef = useRef(null)
  const scrollEndTimerRef = useRef(null)

  const getNavOffset = useCallback(() => 68 + (sectionRef.current?.offsetHeight || 60) + 8, [])

  const getActiveId = useCallback(() => {
    const ids = categoryLinks.map((link) => link.href.replace('#', ''))
    const navOffset = getNavOffset()

    for (let index = ids.length - 1; index >= 0; index -= 1) {
      const section = document.getElementById(ids[index])
      if (section && section.getBoundingClientRect().top <= navOffset) return ids[index]
    }
    return ids[0] ?? ''
  }, [categoryLinks, getNavOffset])

  const handleSelect = (id, event) => {
    event?.preventDefault()
    const targetSection = document.getElementById(id)
    if (!targetSection) return

    navigationTargetRef.current = id
    setActiveId(id)
    const top = Math.max(0, window.scrollY + targetSection.getBoundingClientRect().top - getNavOffset())
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    window.history.pushState(null, '', `#${id}`)
    window.scrollTo({ top, behavior })
  }

  useEffect(() => {
    const onScroll = () => {
      if (navigationTargetRef.current) {
        setActiveId(navigationTargetRef.current)
        if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
        scrollEndTimerRef.current = window.setTimeout(() => {
          navigationTargetRef.current = null
          setActiveId(getActiveId())
        }, 140)
        return
      }
      setActiveId(getActiveId())
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
    }
  }, [getActiveId])

  return (
    <section ref={sectionRef} className="sticky top-[68px] z-30 border-y border-[#EDE5D0] bg-[#FAF6EE]/97 backdrop-blur-md">
      <div className="site-container">
        <CategoryScroller
          activeKey={activeId}
          ariaLabel="Menu categories"
          items={categoryLinks.map((link) => ({
            key: link.href.replace('#', ''),
            label: link.label,
            href: link.href,
          }))}
          onSelect={handleSelect}
        />
      </div>
    </section>
  )
}
