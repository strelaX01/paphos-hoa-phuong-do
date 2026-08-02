'use client'

import Image from 'next/image'
import { CheckCircle2, Plus, RefreshCw, Utensils } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'

import PaginationControls from '@/app/components/shared/PaginationControls'
import { CardGridSkeleton } from '@/app/components/shared/SkeletonBlocks'
import { useCart } from '@/hooks/useCart'
import { dedupeClientRequest } from '@/lib/dedupeClientRequest'
import { DELIVERY_CONFIG } from '@/lib/deliveryConfig'

const ITEMS_PER_PAGE = 6
const emptySubscribe = () => () => {}

function fetchDeliveryMenu() {
  return dedupeClientRequest('/api/delivery/menu', () => {
    return fetch('/api/delivery/menu', { cache: 'no-store' }).then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Could not load the delivery menu.')
        return payload
      })
    })
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: DELIVERY_CONFIG.currency }).format(value)
}

export default function DeliveryOrderClient() {
  const searchParams = useSearchParams()
  const targetId = searchParams.get('item')
  const [deliveryItems, setDeliveryItems] = useState([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [flyItems, setFlyItems] = useState([])
  const [highlightedId, setHighlightedId] = useState(null)
  const [selectedVariants, setSelectedVariants] = useState({})
  const highlightRef = useRef(null)
  const flyIdRef = useRef(0)
  const cart = useCart()
  const { syncCatalog } = cart
  const { setDeliveryPricing } = cart
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const categories = useMemo(() => ['All', ...new Set(deliveryItems.map((item) => item.category))], [deliveryItems])

  useEffect(() => {
    let active = true
    let highlightTimer
    fetchDeliveryMenu()
      .then((payload) => {
        if (!active) return
        setDeliveryItems(payload.data)
        setDeliveryPricing(payload.config)
        syncCatalog(payload.data)
        const target = targetId ? payload.data.find((item) => item.id === targetId) : null
        if (target) {
          const categoryItems = payload.data.filter((item) => item.category === target.category)
          const targetIndex = categoryItems.findIndex((item) => item.id === target.id)
          const targetPage = targetIndex >= 0
            ? Math.floor(targetIndex / ITEMS_PER_PAGE) + 1
            : 1

          setActiveCategory(target.category)
          setPage(targetPage)
          setHighlightedId(target.id)
          highlightTimer = window.setTimeout(() => setHighlightedId(null), 2500)
        }
      })
      .catch((error) => { if (active) setMenuError(error.message || 'Could not load the delivery menu.') })
      .finally(() => { if (active) setMenuLoading(false) })
    return () => { active = false; if (highlightTimer) window.clearTimeout(highlightTimer) }
  }, [setDeliveryPricing, syncCatalog, targetId])

  // Scroll to highlighted item after category/page state settles
  useEffect(() => {
    if (!highlightedId || menuLoading) return

    const timer = window.setTimeout(() => {
      const targetElement = highlightRef.current
        ?? document.getElementById(`delivery-item-${highlightedId}`)
      targetElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [activeCategory, highlightedId, menuLoading, page])

  const visibleItems = activeCategory === 'All'
    ? deliveryItems
    : deliveryItems.filter((item) => item.category === activeCategory)
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / ITEMS_PER_PAGE))
  const pageItems = visibleItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const updatePage = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages)
    setIsLoading(true)
    setPage(safePage)
    window.setTimeout(() => setIsLoading(false), 220)
  }

  const updateCategory = (category) => {
    setIsLoading(true)
    setActiveCategory(category)
    setPage(1)
    window.setTimeout(() => setIsLoading(false), 220)
  }

  const addWithAnimation = (event, item) => {
    const sourceRect = event.currentTarget.getBoundingClientRect()
    const cartButton = getVisibleCartButton()
    const targetRect = cartButton?.getBoundingClientRect()

    const variant = item.variants?.length
      ? item.variants.find((entry) => entry.id === selectedVariants[item.id]) || item.variants[0]
      : null
    cart.addItem(variant ? {
      ...item,
      variantId: variant.id,
      variantLabel: variant.label,
      price: variant.price,
    } : { ...item, variantId: null, variantLabel: null })

    if (!targetRect || !item.image) return

    flyIdRef.current += 1
    const id = `${item.id}-${flyIdRef.current}`
    setFlyItems((current) => [
      ...current,
      {
        id,
        image: item.image,
        name: item.name,
        fromX: sourceRect.left + sourceRect.width / 2,
        fromY: sourceRect.top + sourceRect.height / 2,
        deltaX: targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2),
        deltaY: targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2),
        midX: (targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2)) * 0.62,
        midY: (targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2)) * 0.62 - 92,
      },
    ])

    window.setTimeout(() => {
      setFlyItems((current) => current.filter((flyItem) => flyItem.id !== id))
    }, 820)
  }

  return (
    <div className="min-w-0">
      <div className="min-w-0 border border-[#E8DFC8] bg-[#FAF6EE] p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:flex sm:flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => updateCategory(category)}
              className={`min-w-0 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all sm:px-4 sm:text-[11px] sm:tracking-[0.18em] ${
                activeCategory === category
                  ? 'border-[#8B1E1E] bg-[#8B1E1E] text-white'
                  : 'border-[#E8DFC8] bg-[#FAF6EE] text-[#6B6560] hover:border-[#D4A017]/70 hover:text-[#8B1E1E]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {menuError ? (
          <div className="flex min-h-64 flex-col items-center justify-center border border-[#8B1E1E]/20 bg-[#8B1E1E]/5 p-6 text-center">
            <Utensils className="size-8 text-[#8B1E1E]" />
            <p className="mt-3 font-semibold text-[#2B2B2B]">Delivery menu unavailable</p>
            <p className="mt-1 max-w-md text-sm text-[#6B6560]">{menuError}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex items-center gap-2 bg-[#8B1E1E] px-4 py-2 text-xs font-semibold uppercase text-white"><RefreshCw className="size-4" />Try again</button>
          </div>
        ) : menuLoading || isLoading ? (
          <CardGridSkeleton count={Math.min(ITEMS_PER_PAGE, visibleItems.length || ITEMS_PER_PAGE)} />
        ) : pageItems.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-[#E8DFC8] p-6 text-center"><Utensils className="size-8 text-[#8B1E1E]" /><p className="mt-3 font-semibold">No delivery dishes are available.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
            {pageItems.map((item) => {
              const isTargeted = item.id === targetId
              const isHighlighted = item.id === highlightedId
              const selectedVariantId = selectedVariants[item.id] || item.variants?.[0]?.id || ''
              const selectedVariant = item.variants?.find((variant) => variant.id === selectedVariantId) || item.variants?.[0]
              return (
                <article
                  key={item.id}
                  id={`delivery-item-${item.id}`}
                  ref={isTargeted ? highlightRef : null}
                  aria-label={isTargeted ? `${item.name}, your selected dish` : item.name}
                  className={`group grid grid-cols-[96px_1fr] overflow-hidden border bg-white/65 transition-all hover:border-[#D4A017]/60 sm:grid-cols-[118px_1fr] ${
                    isTargeted
                      ? `border-[#8B1E1E] bg-[#FFF9E9] ring-4 ring-[#D4A017]/45 shadow-[0_12px_30px_rgba(139,30,30,0.18)] ${isHighlighted ? 'animate-pulse-once' : ''}`
                      : 'border-[#E8DFC8]'
                  }`}
                >
                <div className="relative min-h-[136px] overflow-hidden bg-[#E8DFC8] sm:min-h-[158px]">
                  {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.05]" sizes="118px" /> : <div className="flex h-full items-center justify-center text-[#8B1E1E]"><Utensils className="size-7" /></div>}
                </div>
                <div className="flex min-w-0 flex-col p-3 sm:p-4">
                  {isTargeted ? (
                    <div
                      role="status"
                      className="mb-2 inline-flex w-fit items-center gap-1.5 bg-[#8B1E1E] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
                    >
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      Your selected dish
                    </div>
                  ) : null}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold leading-tight text-[#2B2B2B] sm:text-xl">{item.name}</h3>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-[12px] leading-relaxed text-[#6B6560] sm:text-[13px]">{item.description}</p>
                  {item.variants?.length ? (
                    <label className="mt-3 block">
                      <span className="sr-only">Choose a price option for {item.name}</span>
                      <select
                        value={selectedVariantId}
                        onChange={(event) => setSelectedVariants((current) => ({ ...current, [item.id]: event.target.value }))}
                        className="h-9 w-full border border-[#E8DFC8] bg-white px-2 text-[12px] font-semibold text-[#2B2B2B] outline-none focus:border-[#D4A017]"
                      >
                        {item.variants.map((variant) => (
                          <option key={variant.id} value={variant.id}>{variant.label} - {formatMoney(variant.price)}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3 sm:gap-3 sm:pt-4">
                    <span className="inline-flex items-center font-sans font-bold tabular-nums text-[#8B1E1E] text-[14px] sm:text-[15px]" style={{ lineHeight: 1 }}>{formatMoney(selectedVariant?.price ?? item.price)}</span>
                    <button
                      type="button"
                      onClick={(event) => addWithAnimation(event, item)}
                      className="inline-flex items-center gap-1.5 bg-[#2B2B2B] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8B1E1E] sm:gap-2 sm:px-3 sm:text-[11px]"
                    >
                      <Plus className="size-3.5" aria-hidden="true" />
                      Add
                    </button>
                  </div>
                </div>
              </article>
              )
            })}
          </div>
        )}

        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={updatePage}
          className="mt-8"
        />
      </div>
      {mounted && createPortal(
        flyItems.map((item) => (
          <div
            key={item.id}
            className="cart-fly-item"
            style={{
              left: `${item.fromX}px`,
              top: `${item.fromY}px`,
              '--cart-fly-x': `${item.deltaX}px`,
              '--cart-fly-y': `${item.deltaY}px`,
              '--cart-fly-mid-x': `${item.midX}px`,
              '--cart-fly-mid-y': `${item.midY}px`,
            }}
            aria-hidden="true"
          >
            <Image src={item.image} alt={item.name} fill className="object-cover" sizes="58px" />
          </div>
        )),
        document.body
      )}
    </div>
  )
}

function getVisibleCartButton() {
  return Array.from(document.querySelectorAll('[data-cart-button]')).find((button) => {
    const rect = button.getBoundingClientRect()
    const style = window.getComputedStyle(button)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  })
}
