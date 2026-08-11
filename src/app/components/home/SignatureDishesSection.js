import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import DishCard from './DishCard'
import SpicyDishMark from '@/app/components/shared/SpicyDishMark'

export default function SignatureDishesSection({ dishes = [], openingStatus }) {
  if (!dishes.length) return null
  const hasEditorialLayout = dishes.length >= 4

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
        <div data-home-reveal="rise" className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-14">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">From Our Menu</span>
            <h2 className="font-display text-3xl font-bold leading-[1.1] text-[#2B2B2B] sm:text-4xl lg:text-[44px]">A Taste of What We Serve</h2>
          </div>
          <Link id="view-full-menu-btn" href="/menu" className="group inline-flex items-center gap-2 self-start border-b border-[#8B1E1E]/30 pb-0.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1E1E] transition-colors hover:border-[#8B1E1E] sm:self-end">
            View Full Menu
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        {hasEditorialLayout ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.28fr)_minmax(0,0.92fr)] lg:grid-rows-[600px]">
            <EditorialDishCard dish={dishes[0]} index={0} featured className="min-h-[320px] sm:col-span-2 lg:col-span-1 lg:min-h-0" />
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-2 lg:grid-rows-2">
              <EditorialDishCard dish={dishes[1]} index={1} className="min-h-[320px] sm:col-span-2 lg:min-h-0" />
              <EditorialDishCard dish={dishes[2]} index={2} className="min-h-[320px] lg:min-h-0" />
              <EditorialDishCard dish={dishes[3]} index={3} className="min-h-[320px] lg:min-h-0" />
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-8 lg:gap-10 ${gridLayout}`}>
            {dishes.map((dish, index) => <DishCard key={dish.id} dish={dish} index={index} />)}
          </div>
        )}

        <div data-home-reveal="rise" className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[#E8DFC8] pt-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9C9489]">{openingStatus?.text || 'See opening hours'}</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9C9489]">Prepared fresh to order</p>
        </div>
      </div>
    </section>
  )
}

function EditorialDishCard({ className = '', dish, featured = false, index }) {
  return (
    <article
      data-home-reveal="rise"
      className={`group relative isolate overflow-hidden border border-[#E1D5C1] bg-[#2B2B2B] ${dish.isSpicy ? 'spicy-menu-card' : ''} ${className}`}
      style={{ '--home-reveal-delay': `${Math.min(index, 3) * 75}ms` }}
    >
      <Image
        src={dish.image}
        alt={dish.name}
        fill
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
        sizes={featured
          ? '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 56vw'
          : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 24vw'}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/20 to-black/8" />
      {dish.isSpicy ? <SpicyDishMark className="absolute left-0 top-0" /> : null}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-5">
        <span />
        <span className="bg-[#F8F3EA] px-3 py-1.5 text-[13px] font-bold tabular-nums text-[#8B1E1E] shadow-sm">
          {dish.price}
        </span>
      </div>
      <div className={`absolute inset-x-0 bottom-0 p-5 text-white sm:p-6 ${featured ? 'lg:p-8' : ''}`}>
        <div className="mb-3 h-px w-9 bg-[#D4A017] transition-[width] duration-500 group-hover:w-16" />
        <h3 className={`font-display font-bold leading-tight ${featured ? 'text-3xl sm:text-4xl lg:text-[42px]' : 'text-2xl'}`}>
          {dish.name}
        </h3>
        {dish.description ? (
          <p className={`mt-2 max-w-xl leading-relaxed text-white/72 ${featured ? 'line-clamp-3 text-sm sm:text-[15px]' : 'line-clamp-2 text-[13px]'}`}>
            {dish.description}
          </p>
        ) : null}
      </div>
    </article>
  )
}
