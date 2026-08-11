'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

/**
 * Navigates to /delivery and highlights the specific item.
 * Only rendered for deliverable items.
 */
export default function MenuAddToCart({ item }) {
  const router = useRouter()

  function handleClick() {
    router.push(`/delivery?item=${encodeURIComponent(item.id)}`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Order ${item.name} via delivery`}
      className="group mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-[#2B2B2B] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-all duration-200 hover:bg-[#8B1E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2"
    >
      Order This Dish
      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  )
}
