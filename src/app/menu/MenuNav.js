'use client'

import { useEffect, useState } from 'react'

export default function MenuNav({ categoryLinks }) {
  const [activeId, setActiveId] = useState(() => categoryLinks[0]?.href.replace('#', '') || '')

  useEffect(() => {
    const NAV_OFFSET = 140 // sticky header + menu nav height

    function getActiveId() {
      const ids = categoryLinks.map((l) => l.href.replace('#', ''))
      // Walk from bottom to top — first section whose top is above the offset wins
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i])
        if (el && el.getBoundingClientRect().top <= NAV_OFFSET) {
          return ids[i]
        }
      }
      return ids[0] ?? ''
    }

    function onScroll() {
      setActiveId(getActiveId())
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [categoryLinks])

  return (
    <section className="sticky top-[68px] z-30 border-y border-[#EDE5D0] bg-[#FAF6EE]/97 backdrop-blur-md">
      <div className="site-container">
        <nav
          className="grid grid-cols-2 gap-2 py-4 sm:flex sm:flex-wrap"
          aria-label="Menu categories"
        >
          {categoryLinks.map((link) => {
            const id = link.href.replace('#', '')
            const isActive = activeId === id
            return (
              <a
                key={link.href}
                href={link.href}
                className={`min-w-0 border px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] transition-all sm:px-4 sm:text-[11px] sm:tracking-[0.18em] ${
                  isActive
                    ? 'border-[#8B1E1E] bg-[#8B1E1E] text-white'
                    : 'border-[#E8DFC8] bg-[#FAF6EE] text-[#6B6560] hover:border-[#D4A017]/70 hover:text-[#8B1E1E]'
                }`}
              >
                {link.label}
              </a>
            )
          })}
        </nav>
      </div>
    </section>
  )
}
