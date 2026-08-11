'use client'

import { useCallback, useEffect, useRef } from 'react'

import CategoryScroller from '@/app/components/shared/CategoryScroller'
import MenuSearchField from '@/app/components/shared/MenuSearchField'

export default function MenuNav({ activeId, categoryLinks, onActiveIdChange, onQueryChange, query, resultCount }) {
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
    navigationTargetRef.current = id
    onActiveIdChange(id)
    window.history.pushState(null, '', `#${id}`)

    window.requestAnimationFrame(() => {
      const targetSection = document.getElementById(id)
      if (!targetSection) return
      const top = Math.max(0, window.scrollY + targetSection.getBoundingClientRect().top - getNavOffset())
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      window.scrollTo({ top, behavior })
    })
  }

  useEffect(() => {
    if (query) return undefined

    const onScroll = () => {
      if (!window.matchMedia('(min-width: 1024px)').matches) return
      if (navigationTargetRef.current) {
        onActiveIdChange(navigationTargetRef.current)
        if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
        scrollEndTimerRef.current = window.setTimeout(() => {
          navigationTargetRef.current = null
          onActiveIdChange(getActiveId())
        }, 140)
        return
      }
      onActiveIdChange(getActiveId())
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollEndTimerRef.current) window.clearTimeout(scrollEndTimerRef.current)
    }
  }, [getActiveId, onActiveIdChange, query])

  return (
    <section ref={sectionRef} className="sticky top-[68px] z-30 border-y border-[#EDE5D0] bg-[#FAF6EE]/97 backdrop-blur-md">
      <div className="site-container py-2.5">
        <div className="grid min-w-0 gap-2.5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="order-2 min-w-0 lg:order-1">
            {query ? (
              <div className="flex h-10 items-center justify-between border-l-2 border-[#9d2023] px-3 text-sm text-[#6b6560]" role="status" aria-live="polite">
                <span><strong className="text-[#2b241e]">{resultCount}</strong> {resultCount === 1 ? 'dish' : 'dishes'} found</span>
                <span className="hidden text-xs text-[#9a9085] sm:inline">Search covers all categories</span>
              </div>
            ) : (
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
            )}
          </div>
          <div className="order-1 lg:order-2">
            <MenuSearchField value={query} onChange={onQueryChange} />
          </div>
        </div>
      </div>
    </section>
  )
}
