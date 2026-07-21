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
    router.push(`/delivery?item=${item.id}`)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Order ${item.name} via delivery`}
      className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 bg-[#2B2B2B] text-white hover:bg-[#8B1E1E] group"
    >
      Order This Dish
      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  )
}
