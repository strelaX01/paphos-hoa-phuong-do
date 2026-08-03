'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export default function CategoryScroller({ activeKey, ariaLabel, items, onSelect }) {
  const scrollerRef = useRef(null)
  const itemRefs = useRef(new Map())
  const [scrollEdges, setScrollEdges] = useState({ left: false, right: false })

  const updateScrollEdges = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth
    setScrollEdges({
      left: scroller.scrollLeft > 2,
      right: scroller.scrollLeft < maxScrollLeft - 2,
    })
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return undefined

    const resizeObserver = new ResizeObserver(updateScrollEdges)
    resizeObserver.observe(scroller)
    updateScrollEdges()
    return () => resizeObserver.disconnect()
  }, [items, updateScrollEdges])

  useEffect(() => {
    itemRefs.current.get(activeKey)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    const timer = window.setTimeout(updateScrollEdges, 250)
    return () => window.clearTimeout(timer)
  }, [activeKey, updateScrollEdges])

  return (
    <div className="relative">
      <nav
        ref={scrollerRef}
        onScroll={updateScrollEdges}
        className="flex snap-x snap-proximity gap-2 overflow-x-auto py-3 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible lg:py-4 lg:pr-0"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const isActive = activeKey === item.key
          const className = `min-w-max max-w-[calc(100vw-3rem)] shrink-0 snap-start truncate border px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] transition-all lg:text-[11px] lg:tracking-[0.18em] ${
            isActive
              ? 'border-[#8B1E1E] bg-[#8B1E1E] text-white'
              : 'border-[#E8DFC8] bg-[#FAF6EE] text-[#6B6560] hover:border-[#D4A017]/70 hover:text-[#8B1E1E]'
          }`
          const setItemRef = (node) => {
            if (node) itemRefs.current.set(item.key, node)
            else itemRefs.current.delete(item.key)
          }

          return item.href ? (
            <a key={item.key} ref={setItemRef} href={item.href} aria-current={isActive ? 'location' : undefined} className={className} onClick={(event) => onSelect?.(item.key, event)}>
              {item.label}
            </a>
          ) : (
            <button key={item.key} ref={setItemRef} type="button" onClick={() => onSelect?.(item.key)} aria-pressed={isActive} className={className}>
              {item.label}
            </button>
          )
        })}
      </nav>

      {scrollEdges.left ? <span className="pointer-events-none absolute inset-y-0 left-0 w-7 bg-gradient-to-r from-[#FAF6EE] to-transparent lg:hidden" aria-hidden="true" /> : null}
      {scrollEdges.right ? <span className="pointer-events-none absolute inset-y-0 right-0 w-9 bg-gradient-to-l from-[#FAF6EE] to-transparent lg:hidden" aria-hidden="true" /> : null}
    </div>
  )
}
