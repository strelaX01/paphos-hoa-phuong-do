'use client'

import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import MenuNav from './MenuNav'
import MenuSectionItems from './MenuSectionItems'
import { menuItemMatchesQuery, normalizeMenuSearch } from '@/lib/menuSearch'

export default function MenuCatalog({ menuSections }) {
  const [query, setQuery] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState(menuSections[0]?.id || '')
  const emptyStateRef = useRef(null)
  const normalizedQuery = normalizeMenuSearch(query)
  const categoryLinks = menuSections.map((section) => ({
    href: `#${section.id}`,
    label: section.title,
  }))
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return []

    return menuSections.flatMap((section) => section.items
      .filter((item) => menuItemMatchesQuery(item, section.title, normalizedQuery))
      .map((item) => ({ ...item, searchCategory: section.title })))
  }, [menuSections, normalizedQuery])
  const activeCategoryIndex = Math.max(0, menuSections.findIndex((section) => section.id === activeCategoryId))

  const selectCategory = useCallback((id, { updateHistory = true } = {}) => {
    if (!menuSections.some((section) => section.id === id)) return
    setActiveCategoryId(id)
    if (updateHistory) window.history.pushState(null, '', `#${id}`)

    window.requestAnimationFrame(() => {
      const target = document.getElementById(id)
      if (!target) return
      const navigation = document.querySelector('[data-menu-navigation]')
      const offset = 68 + (navigation?.getBoundingClientRect().height || 60) + 8
      const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset)
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      window.scrollTo({ top, behavior })
    })
  }, [menuSections])

  useEffect(() => {
    const syncCategoryFromUrl = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (id && menuSections.some((section) => section.id === id)) setActiveCategoryId(id)
    }

    syncCategoryFromUrl()
    window.addEventListener('hashchange', syncCategoryFromUrl)
    window.addEventListener('popstate', syncCategoryFromUrl)
    return () => {
      window.removeEventListener('hashchange', syncCategoryFromUrl)
      window.removeEventListener('popstate', syncCategoryFromUrl)
    }
  }, [menuSections])

  useEffect(() => {
    if (!normalizedQuery || searchResults.length) return undefined

    const frame = window.requestAnimationFrame(() => {
      emptyStateRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [normalizedQuery, searchResults.length])

  return (
    <>
      <MenuNav
        activeId={activeCategoryId}
        categoryLinks={categoryLinks}
        onActiveIdChange={setActiveCategoryId}
        query={query}
        resultCount={searchResults.length}
        onQueryChange={setQuery}
      />

      <div className="py-16 lg:py-24">
        {normalizedQuery ? (
          <section aria-label="Menu search results" className="bg-[#F8F3EA] py-4 lg:py-8">
            <div className="site-container">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[#e4dac9] pb-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9d2023]">Search results</span>
                  <h2 className="mt-2 font-display text-3xl font-bold text-[#2b2b2b] sm:text-4xl">
                    {searchResults.length} {searchResults.length === 1 ? 'dish' : 'dishes'} found
                  </h2>
                </div>
                <p className="max-w-md text-sm text-[#6b6560]">Matching dish names and menu categories.</p>
              </div>

              {searchResults.length ? (
                <MenuSectionItems key={normalizedQuery} items={searchResults} showCategory />
              ) : (
                <div ref={emptyStateRef} className="flex min-h-[55svh] scroll-mt-44 flex-col items-center justify-center border-y border-[#e4dac9] px-5 text-center">
                  <SearchX className="size-8 text-[#9d2023]" aria-hidden="true" />
                  <h3 className="mt-4 font-display text-2xl font-bold text-[#2b2b2b]">No matching dishes</h3>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6b6560]">Try another dish name or category.</p>
                  <button type="button" onClick={() => setQuery('')} className="mt-5 border border-[#9d2023] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#9d2023] transition-colors hover:bg-[#9d2023] hover:text-white">Clear search</button>
                </div>
              )}
            </div>
          </section>
        ) : menuSections.map((section, index) => (
          <MenuSection
            key={section.id}
            section={section}
            active={section.id === activeCategoryId}
            categoryIndex={index}
            categoryCount={menuSections.length}
            onPrevious={index > 0 ? () => selectCategory(menuSections[index - 1].id) : null}
            onNext={index < menuSections.length - 1 ? () => selectCategory(menuSections[index + 1].id) : null}
          />
        ))}
      </div>
    </>
  )
}

function MenuSection({ active, categoryCount, categoryIndex, onNext, onPrevious, section }) {
  return (
    <section id={section.id} className={`${active ? 'block' : 'hidden'} scroll-mt-48 bg-[#F8F3EA] py-10 lg:block lg:py-16`}>
      <div className="site-container">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">{section.eyebrow}</span>
            <h2 className="font-display text-4xl font-bold leading-[1.08] text-[#2B2B2B] lg:text-[48px]">{section.title}</h2>
          </div>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[#6B6560]">{section.description}</p>
        </div>
        <MenuSectionItems items={section.items} />
        {categoryCount > 1 ? (
          <nav className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center border-y border-[#E4DAC9] py-3 lg:hidden" aria-label="Browse menu categories">
            <button type="button" disabled={!onPrevious} onClick={onPrevious || undefined} className="flex min-h-11 items-center gap-1.5 justify-self-start px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B1E1E] transition-colors disabled:invisible">
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </button>
            <span className="px-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[#81766B]">
              {categoryIndex + 1} / {categoryCount}
            </span>
            <button type="button" disabled={!onNext} onClick={onNext || undefined} className="flex min-h-11 items-center gap-1.5 justify-self-end px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B1E1E] transition-colors disabled:invisible">
              Next <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  )
}
