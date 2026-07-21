import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import DishCard from './DishCard'

export default function SignatureDishesSection({ dishes = [], openingStatus }) {
  if (!dishes.length) return null

  const gridLayout = dishes.length === 1
    ? 'mx-auto max-w-md'
    : dishes.length === 2
      ? 'mx-auto max-w-4xl sm:grid-cols-2'
      : dishes.length === 3
        ? 'mx-auto max-w-6xl sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4'

  return (
    <section id="signature-dishes" aria-label="Menu preview" className="bg-[#F8F3EA] py-20 lg:py-28">
      <div className="site-container">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-14">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">From Our Menu</span>
            <h2 className="font-display text-3xl font-bold leading-[1.1] text-[#2B2B2B] sm:text-4xl lg:text-[44px]">A Taste of What We Serve</h2>
          </div>
          <Link id="view-full-menu-btn" href="/menu" className="group inline-flex items-center gap-2 self-start border-b border-[#8B1E1E]/30 pb-0.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1E1E] transition-colors hover:border-[#8B1E1E] sm:self-end">
            View Full Menu
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <div className={`grid grid-cols-1 gap-8 lg:gap-10 ${gridLayout}`}>
          {dishes.map((dish, index) => <DishCard key={dish.id} dish={dish} index={index} />)}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[#E8DFC8] pt-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9C9489]">{openingStatus?.text || 'See opening hours'}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9C9489]">Prepared fresh to order</p>
        </div>
      </div>
    </section>
  )
}
