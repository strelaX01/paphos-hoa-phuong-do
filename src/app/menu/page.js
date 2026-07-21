import Link from 'next/link'
import Image from 'next/image'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import MenuNav from './MenuNav'
import MenuSectionItems from './MenuSectionItems'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Menu | Hoa Phuong Do Vietnamese Restaurant',
  description:
    'Explore Hoa Phuong Do menu with pho, rice plates, fresh rolls, vegetarian dishes, drinks, and desserts in Cyprus.',
}

export default async function MenuPage() {
  const menuSections = await getMenuSections()
  const categoryLinks = menuSections?.map((section) => ({
    href: `#${section.id}`,
    label: section.title,
  })) || []

  return (
    <>
      <Header />
      <main className="bg-[#F8F3EA]">
        <MenuHero />
        {categoryLinks.length ? <MenuNav categoryLinks={categoryLinks} /> : null}
        <div className="py-16 lg:py-24">
          {menuSections === null ? <MenuUnavailable /> : menuSections.length ? menuSections.map((section) => (
            <MenuSection key={section.id} section={section} />
          )) : <EmptyMenu />}
        </div>
        <MenuCTA />
      </main>
      <Footer />
    </>
  )
}

async function getMenuSections() {
  try {
    const categories = await prisma.menuCategory.findMany({
      where: { isActive: true, items: { some: { isActive: true } } },
      orderBy: { title: 'asc' },
      select: {
        slug: true,
        title: true,
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            slug: true,
            name: true,
            nameEn: true,
            description: true,
            price: true,
            image: true,
            deliverable: true,
            tag: { select: { label: true } },
          },
        },
      },
    })

    return categories.map((category) => ({
      id: category.slug,
      title: category.title,
      eyebrow: `${category.items.length} ${category.items.length === 1 ? 'dish' : 'dishes'}`,
      description: 'Prepared fresh to order using carefully selected ingredients and our kitchen recipes.',
      items: category.items.map((item) => ({
        id: item.slug,
        name: item.name,
        nameEn: item.nameEn || '',
        description: item.description || '',
        price: formatMoney(item.price),
        image: item.image || '',
        deliverable: item.deliverable,
        tag: item.tag?.label || '',
      })),
    }))
  } catch (error) {
    console.error('Failed to load public menu', error)
    return null
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value))
}

function MenuHero() {
  return (
    <section className="relative isolate min-h-[62svh] overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1920&q=90"
        alt="Vietnamese pho with fresh herbs and noodles"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/55 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

      <div className="site-container relative z-10 flex min-h-[62svh] items-center pt-24">
        <div className="max-w-2xl py-20">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#D4A017]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Vietnamese Menu
            </span>
          </div>
          <h1 className="font-display text-[42px] font-bold leading-[1.05] text-white sm:text-6xl lg:text-[72px]">
            Fresh Bowls, Hot Broths,
            <span className="block text-[#D4A017]">Family Recipes</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
            Explore our full menu of Vietnamese classics, grilled rice plates, fresh starters, vegetarian dishes, and sweet finishes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/delivery"
              className="inline-flex items-center justify-center bg-[#8B1E1E] px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a02424]"
            >
              Order Delivery
            </Link>
            <Link
              href="/book-table"
              className="inline-flex items-center justify-center border border-white/35 px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white transition-all hover:border-white/70 hover:bg-white/10"
            >
              Book a Table
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function MenuSection({ section }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-32 bg-[#F8F3EA] py-12 lg:py-16"
    >
      <div className="site-container">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              {section.eyebrow}
            </span>
            <h2 className="font-display text-4xl font-bold leading-[1.08] text-[#2B2B2B] lg:text-[48px]">
              {section.title}
            </h2>
          </div>
          <p className="max-w-2xl text-[14px] leading-relaxed text-[#6B6560]">
            {section.description}
          </p>
        </div>

        <MenuSectionItems items={section.items} />
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
