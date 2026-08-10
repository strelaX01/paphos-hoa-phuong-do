import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Utensils } from 'lucide-react'

export default function BookingCTA({ restaurantProfile, openingStatus }) {
  if (!restaurantProfile) return null

  const quickInfo = [
    { label: 'Today', value: openingStatus?.text || 'See opening hours' },
  ]

  return (
    <section id="booking-cta" aria-label="Reserve your table" className="relative min-h-[560px] overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/hpd2.png"
          alt="Table ready for restaurant guests"
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/65 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      </div>

      <div className="site-container relative z-10 flex items-center py-24 lg:py-32">
        <div data-home-reveal="rise" className="max-w-lg">
          <div className="mb-5 flex items-center gap-3">
            <span className="block h-px w-7 bg-[#D4A017]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">Reservations</span>
          </div>
          <h2 className="mb-5 font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-[54px]">Reserve Your<br />Table Today</h2>
          <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-white/60">Experience Vietnamese cuisine in a welcoming atmosphere. Send your reservation request and our team will confirm it.</p>

          <div className="flex flex-wrap items-center gap-4">
            <Link id="booking-cta-btn" href="/book-table" className="group inline-flex items-center gap-2.5 bg-[#D4A017] px-8 py-3.5 text-[13px] font-bold uppercase tracking-[0.12em] text-[#1a0a0a] transition-colors hover:bg-[#e8c228]">
              Book Now <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link href="/menu" className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/75 transition-colors hover:border-[#D4A017]/60 hover:text-white">
              <Utensils className="size-4 text-[#D4A017]" aria-hidden="true" /> View Menu
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-6">
            {quickInfo.map((item) => (
              <div key={item.label} className="max-w-xs">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">{item.label}</p>
                <p className="mt-0.5 break-words text-[13px] font-medium text-white/70">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
