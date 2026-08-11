import Link from 'next/link'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import HeroImage from '@/app/components/shared/HeroImage'
import MenuCatalog from './MenuCatalog'
import { getPublicMenuPageSections } from '@/lib/publicMenuData'
import { createPageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Vietnamese Menu in Kissonerga',
  description: 'Explore the Hoa Phuong Do menu with Vietnamese pho, rice dishes, fresh starters, vegetarian options, drinks, and desserts in Kissonerga.',
  path: '/menu',
  keywords: ['Vietnamese menu Kissonerga', 'pho menu Cyprus', 'Vietnamese dishes Kissonerga'],
})

export default async function MenuPage() {
  const menuSections = await getMenuSections()
  return (
    <>
      <Header />
      <main className="bg-[#F8F3EA]">
        <MenuHero />
        {menuSections === null ? <div className="py-16 lg:py-24"><MenuUnavailable /></div> : menuSections.length ? <MenuCatalog menuSections={menuSections} /> : <div className="py-16 lg:py-24"><EmptyMenu /></div>}
        <MenuCTA />
      </main>
      <Footer />
    </>
  )
}

async function getMenuSections() {
  try {
    return await getPublicMenuPageSections()
  } catch (error) {
    console.error('Failed to load public menu', error)
    return null
  }
}

function MenuHero() {
  return (
    <section className="relative isolate min-h-[522px] overflow-hidden bg-[#1E1A18] sm:min-h-[58svh]">
      <HeroImage
        src="/images/hpd4.png"
        alt="Vietnamese pho with fresh herbs and noodles"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

      <div className="site-container relative z-10 flex min-h-[522px] items-center pt-20 sm:min-h-[58svh] sm:pt-24">
        <div className="max-w-2xl pb-0 pt-6 sm:-translate-y-6 sm:pt-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#D4A017]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Vietnamese Menu
            </span>
          </div>
          <h1 className="font-display text-[42px] font-bold leading-[1.05] text-white sm:text-6xl lg:text-[64px]">
            Fresh Bowls, Hot Broths,
            <span className="block text-[#D4A017]">Family Recipes</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
            Explore our full menu of Vietnamese classics, grilled rice plates, fresh starters, vegetarian dishes, and sweet finishes.
          </p>
          <div className="mt-6 flex items-center gap-2 sm:mt-8 sm:gap-3">
            <Link
              href="/delivery"
              className="inline-flex min-w-0 flex-1 items-center justify-center bg-[#8B1E1E] px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#a02424] sm:flex-none sm:px-7 sm:text-[13px] sm:tracking-[0.12em]"
            >
              Order Delivery
            </Link>
            <Link
              href="/book-table"
              className="inline-flex min-w-0 flex-1 items-center justify-center border border-white/35 px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition-all hover:border-white/70 hover:bg-white/10 sm:flex-none sm:px-7 sm:text-[13px] sm:tracking-[0.12em]"
            >
              Book a Table
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function EmptyMenu() {
  return <div className="site-container"><div className="border-y border-[#D4A017]/25 py-16 text-center"><h2 className="font-display text-3xl font-bold text-[#2B2B2B]">Our menu is being updated.</h2><p className="mt-3 text-sm text-[#6B6560]">Please check back shortly or contact the restaurant for today&apos;s dishes.</p></div></div>
}

function MenuUnavailable() {
  return <div className="site-container"><div className="border-y border-red-900/15 py-16 text-center"><h2 className="font-display text-3xl font-bold text-[#2B2B2B]">Menu temporarily unavailable.</h2><p className="mt-3 text-sm text-[#6B6560]">Please contact the restaurant and our team will help with your order.</p></div></div>
}


function MenuCTA() {
  return (
    <section className="bg-[#F2EAD8] py-16 lg:py-20">
      <div className="site-container">
        <div className="grid gap-8 border-y border-[#D4A017]/25 py-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Ready to Taste Vietnam
            </span>
            <h2 className="font-display text-4xl font-bold leading-tight text-[#2B2B2B] lg:text-[52px]">
              Reserve a table or order your favorites.
            </h2>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#6B6560]">
              Dishes are prepared fresh daily. Ask our team about spice levels, vegetarian options, and family-style sharing.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/book-table"
              className="inline-flex items-center justify-center bg-[#8B1E1E] px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a02424]"
            >
              Reserve a Table
            </Link>
            <Link
              href="/delivery"
              className="inline-flex items-center justify-center border border-[#8B1E1E]/35 px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#8B1E1E] transition-all hover:border-[#8B1E1E] hover:bg-white/40"
            >
              Order Online
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
