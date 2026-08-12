import Link from 'next/link'
import localFont from 'next/font/local'
import { ArrowRight, Clock3, MapPin } from 'lucide-react'
import HeroImage from '@/app/components/shared/HeroImage'

const heroDisplayFont = localFont({
  src: '../../fonts/cormorant-latin.woff2',
  variable: '--font-hero-display',
  weight: '300 700',
  display: 'swap',
  fallback: ['Georgia'],
  adjustFontFallback: 'Times New Roman',
  preload: true,
})

const heroSansFont = localFont({
  src: '../../fonts/inter-latin.woff2',
  variable: '--font-hero-sans',
  weight: '100 900',
  display: 'swap',
  fallback: ['Arial'],
  adjustFontFallback: 'Arial',
  preload: true,
})

export default function HeroSection({ openingStatus, restaurantProfile, menuItemCount = 0 }) {
  const dishCountLabel = menuItemCount > 0
    ? `${menuItemCount} ${menuItemCount === 1 ? 'dish' : 'dishes'} on our menu`
    : 'Explore our menu'

  return (
    <section id="hero" aria-label={`Welcome to ${restaurantProfile?.name || 'the restaurant'}`} className={`${heroDisplayFont.variable} ${heroSansFont.variable} relative isolate flex min-h-[100svh] min-w-0 flex-col overflow-hidden bg-[#1E1A18] font-[family-name:var(--font-hero-sans)]`}>
      <div className="home-hero-media absolute inset-0">
        <HeroImage
          src="/images/hpd-hero.png"
          alt="A steaming bowl of authentic Vietnamese pho"
          className="object-cover object-[62%_center] sm:object-[44%_center] lg:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/84 via-black/38 to-black/8 sm:from-black/82 sm:via-black/50 lg:from-black/75 lg:via-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/0 to-black/38 sm:from-black/55 sm:via-transparent sm:to-black/34" />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 items-center">
        <div className="site-container pb-16 pt-28 sm:py-32 lg:py-40">
          <div className="home-hero-content max-w-[21rem] min-w-0 sm:max-w-xl">
            <div className="home-hero-intro mb-5 flex items-center gap-3" style={{ '--home-intro-delay': '120ms' }}>
              <span className="h-px w-7 shrink-0 bg-[#D4A017] sm:w-8" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4A017] sm:text-[11px] sm:tracking-[0.3em]">Authentic Vietnamese Cuisine · Cyprus</span>
            </div>

            <p className="home-hero-intro mb-2 font-[family-name:var(--font-hero-display)] text-lg tracking-wide text-white/68 sm:text-2xl" style={{ '--home-intro-delay': '210ms' }}>{restaurantProfile?.name}</p>
            <h1 className="home-hero-intro mb-5 font-[family-name:var(--font-hero-display)] font-bold leading-[1.08] text-white sm:mb-6" style={{ '--home-intro-delay': '280ms' }}>
              <span className="block text-[33px] sm:text-5xl lg:text-[58px]">Traditional Vietnamese</span>
              <span className="block text-[33px] text-[#D4A017] sm:text-5xl lg:text-[58px]">Flavors in Cyprus</span>
            </h1>
            <p className="home-hero-intro mb-7 max-w-[20rem] text-[14px] leading-relaxed text-white/76 sm:mb-8 sm:max-w-md sm:text-base sm:text-white/65" style={{ '--home-intro-delay': '370ms' }}>
              Experience authentic Vietnamese recipes, fresh ingredients, and warm hospitality in Kissonerga.
            </p>

            <div className="home-hero-intro mb-9 flex flex-col items-start gap-3 sm:mb-10 sm:flex-row sm:flex-wrap sm:items-center" style={{ '--home-intro-delay': '450ms' }}>
              <Link id="hero-reserve-btn" href="/book-table" className="group inline-flex w-full max-w-[220px] items-center justify-center gap-2.5 bg-[#8B1E1E] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#a02424] sm:w-auto sm:max-w-none sm:px-7 sm:text-[13px]">
                Reserve a Table <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link id="hero-order-btn" href="/delivery" className="inline-flex w-full max-w-[220px] items-center justify-center border border-white/35 px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:border-white/70 hover:bg-white/8 sm:w-auto sm:max-w-none sm:px-7 sm:text-[13px]">
                Order Delivery
              </Link>
            </div>

            <div className="home-hero-intro flex flex-wrap items-start gap-x-6 gap-y-3 text-[12px] text-white/55" style={{ '--home-intro-delay': '530ms' }}>
              <div className="flex max-w-xs items-start gap-1.5">
                <MapPin className="mt-0.5 size-3 shrink-0 text-[#D4A017]" aria-hidden="true" />
                <span>{restaurantProfile?.address || 'See our location'}</span>
              </div>
              <span className="hidden text-white/20 sm:block">|</span>
              <div className="flex items-center gap-1.5">
                <Clock3 className="size-3 shrink-0 text-[#D4A017]" aria-hidden="true" />
                <span>{openingStatus?.text || 'See opening hours'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10">
        <div className="site-container flex items-center justify-between py-4">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">{dishCountLabel}</span>
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/35">Discover</span>
        </div>
      </div>
    </section>
  )
}
