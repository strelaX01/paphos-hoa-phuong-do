import Image from 'next/image'
import Link from 'next/link'
import { Clock, ExternalLink, Mail, MapPin, MessageSquare, Phone, Utensils } from 'lucide-react'
import { connection } from 'next/server'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import HeroImage from '@/app/components/shared/HeroImage'
import GoogleMapConsent from '@/app/contact/GoogleMapConsent'
import { getRestaurantProfileData, phoneHref } from '@/lib/restaurantProfileData'
import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Contact and Opening Hours',
  description: 'Find Hoa Phuong Do in Kissonerga, Cyprus. View opening hours, phone numbers, email, address, and Google Maps directions.',
  path: '/contact',
  keywords: ['Hoa Phuong Do contact', 'Vietnamese restaurant opening hours Kissonerga', 'Kissonerga restaurant directions'],
})

export default async function ContactPage() {
  await connection()
  const restaurantData = await getRestaurantProfileData()

  return (
    <>
      <Header />
      <main className="overflow-x-hidden bg-[#F8F3EA]">
        <ContactHero profile={restaurantData.profile} />
        <ContactSection profile={restaurantData.profile} />
        <VisitSection profile={restaurantData.profile} openingHours={restaurantData.openingHours} />
      </main>
      <Footer restaurantData={restaurantData} />
    </>
  )
}

function ContactHero({ profile }) {
  return (
    <section className="relative isolate min-h-[58svh] overflow-hidden bg-[#1E1A18]">
      <HeroImage
        src="/images/hpd8.png"
        alt="Guests dining in a warm restaurant"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/58 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

      <div className="site-container relative z-10 flex min-h-[58svh] items-center pt-24">
        <div className="max-w-2xl py-20">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#D4A017]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Contact
            </span>
          </div>
          <h1 className="font-display text-[42px] font-bold leading-[1.05] text-white sm:text-6xl lg:text-[72px]">
            Find Us in
            <span className="block text-[#D4A017]">{profile.name}</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
            Call, send a note, or visit us for warm Vietnamese dining and delivery.
          </p>
        </div>
      </div>
    </section>
  )
}

function ContactSection({ profile }) {
  const phoneNumbers = splitPhoneNumbers(profile.phone)
  const contactCards = [
    {
      icon: <Phone className="size-5" />,
      title: 'Call us',
      text: 'For same-day tables, delivery questions, or group bookings.',
      actions: phoneNumbers.map((phone) => ({ label: phone, href: phoneHref(phone) })),
    },
    ...(profile.email ? [{ icon: <Mail className="size-5" />, title: 'Email', text: 'Send notes about private dining, allergies, or special requests.', actions: [{ label: profile.email, href: `mailto:${profile.email}` }] }] : []),
    {
      icon: <MapPin className="size-5" />,
      title: 'Visit',
      text: profile.address,
      actions: [{ label: 'Open map', href: publicMapUrl(profile) }],
    },
  ]

  return (
    <section className="py-16 lg:py-24">
      <div className="site-container">
        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <aside className="space-y-5">
            {contactCards.map((card) => (
              <article
                key={card.title}
                className="border border-[#E8DFC8] bg-[#FAF6EE] p-6 shadow-sm"
              >
                <div className="mb-5 flex size-11 items-center justify-center bg-[#8B1E1E] text-white">
                  {card.icon}
                </div>
                <h2 className="font-display text-3xl font-bold text-[#2B2B2B]">{card.title}</h2>
                <p className="mt-3 text-[13px] leading-relaxed text-[#6B6560]">{card.text}</p>
                <div className="mt-5 flex flex-col items-start gap-2">{card.actions.map((action) => <a key={`${card.title}-${action.label}`} href={action.href} target={card.title === 'Visit' ? '_blank' : undefined} rel={card.title === 'Visit' ? 'noreferrer' : undefined} className="break-all border-b border-[#D4A017]/40 pb-1 text-[12px] font-semibold text-[#8B1E1E] hover:border-[#8B1E1E]">{action.label}</a>)}</div>
              </article>
            ))}
          </aside>

          <div className="overflow-hidden border border-[#E8DFC8] bg-[#FAF6EE] shadow-sm">
            <div className="p-5 sm:p-7"><span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">Google Map</span><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-4xl font-bold leading-tight text-[#2B2B2B]">Find the restaurant.</h2><p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#6B6560]">{profile.address}</p></div><a href={publicMapUrl(profile)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#8B1E1E] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white"><ExternalLink className="size-4" />Open map</a></div></div>
            <GoogleMapConsent
              address={profile.address}
              embedUrl={mapEmbedUrl(profile)}
              mapUrl={publicMapUrl(profile)}
              restaurantName={profile.name}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function VisitSection({ openingHours, profile }) {
  return (
    <section className="bg-[#1E1A18] py-16 lg:py-20">
      <div className="site-container">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="relative min-h-[360px] overflow-hidden border border-white/10 bg-white/[0.03]">
            <Image
              src="https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1400&q=90"
              alt="Restaurant table prepared for evening service"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
                Directions
              </span>
              <h2 className="max-w-xl font-display text-4xl font-bold leading-tight text-white">
                {profile.address}
              </h2>
            </div>
          </div>

          <aside className="border border-white/10 bg-white/[0.03] p-6 text-white sm:p-8">
            <div className="mb-7">
              <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
                Visit Details
              </span>
              <h2 className="font-display text-3xl font-bold">Opening Hours</h2>
            </div>
            <ul className="space-y-3">
              {openingHours.map((item) => (
                <li key={item.id || item.day} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                  <span className="text-[13px] text-white/45">{item.day}</span>
                  <span className="text-[13px] font-semibold text-white">{item.isClosed ? 'Closed' : item.hours}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 space-y-4 border-t border-white/10 pt-7 text-[13px] leading-relaxed text-white/50">
              <p className="flex items-start gap-3">
                <Utensils className="mt-0.5 size-4 shrink-0 text-[#D4A017]" aria-hidden="true" />
                Dinner and weekends can be busy, so booking ahead is recommended.
              </p>
              <p className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-[#D4A017]" aria-hidden="true" />
                Delivery runs during regular service hours.
              </p>
              <p className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 size-4 shrink-0 text-[#D4A017]" aria-hidden="true" />
                For urgent requests, calling is faster than email.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/book-table"
                className="inline-flex items-center justify-center bg-[#8B1E1E] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#a02424]"
              >
                Book Table
              </Link>
              <Link
                href="/delivery"
                className="inline-flex items-center justify-center border border-white/15 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-[#D4A017]/60 hover:text-[#D4A017]"
              >
                Order Delivery
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function splitPhoneNumbers(phone) {
  return String(phone || '').split('/').map((value) => value.trim()).filter(Boolean)
}

function publicMapUrl(profile) {
  return profile.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`
}

function mapEmbedUrl(profile) {
  if (profile.mapUrl && (profile.mapUrl.includes('/embed') || profile.mapUrl.includes('output=embed'))) return profile.mapUrl
  return `https://www.google.com/maps?q=${encodeURIComponent(profile.address)}&output=embed`
}
