import { Clock, PackageCheck } from 'lucide-react'
import { connection } from 'next/server'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import HeroImage from '@/app/components/shared/HeroImage'
import { DELIVERY_CONFIG } from '@/lib/deliveryConfig'
import { getDeliveryPricingData } from '@/lib/deliveryPricingData'
import { getRestaurantProfileData, getTodayOpeningStatus } from '@/lib/restaurantProfileData'
import { createPageMetadata } from '@/lib/seo'
import DeliveryOrderClient from './DeliveryOrderClient'

export const metadata = createPageMetadata({
  title: 'Vietnamese Food Delivery in Paphos',
  description: 'Order Vietnamese food delivery from Hoa Phuong Do in Kissonerga, Paphos, including pho, rice dishes, starters, vegetarian options, and drinks.',
  path: '/delivery',
  keywords: ['Vietnamese delivery Paphos', 'food delivery Kissonerga', 'order pho Cyprus'],
})

export default async function DeliveryPage() {
  await connection()
  const restaurantData = await getRestaurantProfileData()
  const pricing = await getDeliveryPricingData()
  const openingStatus = getTodayOpeningStatus(restaurantData.openingHours)
  const nearbyFee = formatMoney(pricing.nearbyDeliveryFee)
  const fartherFee = formatMoney(pricing.fartherDeliveryFee)

  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-[#F8F3EA]">
        <DeliveryHero />
        <section className="py-16 lg:py-24">
          <div className="site-container">
            <div className="mb-8">
              <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
                Order Online
              </span>
              <h2 className="max-w-3xl font-display text-4xl font-bold leading-tight text-[#2B2B2B] lg:text-[52px]">
                Vietnamese dishes delivered fresh.
              </h2>
              <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-[#6B6560]">
                Add dishes to your cart and send the order request. Delivery is {nearbyFee} nearby and {fartherFee} for farther areas.
              </p>
            </div>
            <DeliveryOrderClient />
          </div>
        </section>
        <DeliveryInfo openingStatus={openingStatus} />
      </main>
      <Footer restaurantData={restaurantData} />
    </>
  )
}

function DeliveryHero() {
  return (
    <section className="relative isolate min-h-[58svh] overflow-hidden bg-[#1E1A18]">
      <HeroImage
        src="/images/hpd6.png"
        alt="Vietnamese dishes packed for delivery"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/58 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

      <div className="site-container relative z-10 flex min-h-[58svh] items-center pt-24">
        <div className="max-w-2xl py-20">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#D4A017]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">Delivery</span>
          </div>
          <h1 className="font-display text-[42px] font-bold leading-[1.05] text-white sm:text-6xl lg:text-[72px]">
            Delivery To Your Door
            <span className="block text-[#D4A017]">Vietnamese Classics</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
            Order Vietnamese comfort food for lunch, dinner, or a quiet night at home.
          </p>
        </div>
      </div>
    </section>
  )
}

function DeliveryInfo({ openingStatus }) {
  const info = [
    {
      icon: <Clock className="size-5" />,
      title: 'Delivery hours',
      text: `Delivery follows restaurant service hours. ${openingStatus.text}.`,
    },
    {
      icon: <PackageCheck className="size-5" />,
      title: 'Fresh packing',
      text: 'Broths, noodles, herbs, and sauces are packed separately where possible for better texture.',
    },
  ]

  return (
    <section className="bg-[#1E1A18] py-16 lg:py-20">
      <div className="site-container">
        <div className="grid gap-5 sm:grid-cols-2">
          {info.map((item) => (
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

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: DELIVERY_CONFIG.currency,
  }).format(value)
}
