import Link from 'next/link'
import { ChefHat, Sparkles, Utensils } from 'lucide-react'
import { connection } from 'next/server'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import HeroImage from '@/app/components/shared/HeroImage'
import { getPublishedGalleryPhotosOrEmpty } from '@/lib/publicGalleryData'
import { getRestaurantProfileData } from '@/lib/restaurantProfileData'
import { createPageMetadata } from '@/lib/seo'
import GalleryGridClient from './GalleryGridClient'

export const metadata = createPageMetadata({
  title: 'Vietnamese Food and Restaurant Gallery',
  description: 'See Vietnamese dishes, fresh ingredients, dining moments, and the welcoming atmosphere at Hoa Phuong Do in Kissonerga, Paphos.',
  path: '/gallery',
  keywords: ['Vietnamese food gallery', 'Hoa Phuong Do photos', 'restaurant Kissonerga'],
})

const featureNotes = [
  {
    icon: <Utensils className="size-5" />,
    title: 'Signature dishes',
    text: 'Pho, rice plates, rolls, broths, herbs, and sharing plates served with care.',
  },
  {
    icon: <ChefHat className="size-5" />,
    title: 'Fresh preparation',
    text: 'A closer look at the kitchen rhythm behind our Vietnamese comfort food.',
  },
  {
    icon: <Sparkles className="size-5" />,
    title: 'Warm evenings',
    text: 'Soft lighting, easy hospitality, and tables made for unhurried meals.',
  },
]

export default async function GalleryPage() {
  await connection()
  const [restaurantData, galleryItems] = await Promise.all([
    getRestaurantProfileData(),
    getPublishedGalleryPhotosOrEmpty(),
  ])

  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-[#F8F3EA]">
        <GalleryHero />
        <GalleryGrid items={galleryItems} />
        <GalleryNotes />
      </main>
      <Footer restaurantData={restaurantData} />
    </>
  )
}

function GalleryHero() {
  return (
    <section className="relative isolate min-h-[58svh] overflow-hidden bg-[#1E1A18]">
      <HeroImage
        src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=90"
        alt="Warm restaurant dining room"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/58 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

      <div className="site-container relative z-10 flex min-h-[58svh] items-center pt-24">
        <div className="max-w-2xl py-20">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#D4A017]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Gallery
            </span>
          </div>
          <h1 className="font-display text-[42px] font-bold leading-[1.05] text-white sm:text-6xl lg:text-[72px]">
            Moments From
            <span className="block text-[#D4A017]">Our Vietnamese Table</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
            A visual taste of our dishes, dining room, kitchen moments, and fresh ingredients.
          </p>
        </div>
      </div>
    </section>
  )
}

function GalleryGrid({ items }) {
  return (
    <section className="py-16 lg:py-24">
      <div className="site-container">
        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Photo Journal
            </span>
            <h2 className="max-w-3xl font-display text-4xl font-bold leading-tight text-[#2B2B2B] lg:text-[52px]">
              Food, atmosphere, and the details between.
            </h2>
          </div>
          <Link
            href="/book-table"
            className="self-start border-b border-[#8B1E1E]/40 pb-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1E1E] transition-colors hover:border-[#8B1E1E]"
          >
            Book a Table
          </Link>
        </div>

        <GalleryGridClient items={items} />
      </div>
    </section>
  )
}

function GalleryNotes() {
  return (
    <section className="bg-[#1E1A18] py-16 lg:py-20">
      <div className="site-container">
        <div className="grid gap-5 lg:grid-cols-3">
          {featureNotes.map((item) => (
            <article key={item.title} className="border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-5 flex size-11 items-center justify-center bg-[#8B1E1E] text-white">
                {item.icon}
              </div>
              <h2 className="font-display text-2xl font-bold text-white">{item.title}</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-white/45">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
