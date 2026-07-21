import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'
import { Clock, MapPin, Phone, Sparkles, UsersRound, Utensils } from 'lucide-react'

import Footer from '@/app/components/layout/Footer'
import Header from '@/app/components/layout/Header'
import { getRestaurantProfileData, phoneHref, splitPhoneNumbers } from '@/lib/restaurantProfileData'
import ReservationForm from './ReservationForm'

export const metadata = {
  title: 'Book a Table | Hoa Phuong Do Vietnamese Restaurant',
  description:
    'Reserve your table at Hoa Phuong Do Vietnamese restaurant in Cyprus for lunch, dinner, groups, and special occasions.',
}

const diningNotes = [
  {
    icon: <Utensils className="size-5" />,
    title: 'Fresh daily',
    text: 'Broths, herbs, sauces, and grilled dishes prepared with care each day.',
  },
  {
    icon: <UsersRound className="size-5" />,
    title: 'Groups welcome',
    text: 'Comfortable seating for couples, families, and groups up to 20 guests.',
  },
  {
    icon: <Sparkles className="size-5" />,
    title: 'Special occasions',
    text: 'Tell us about birthdays, allergies, or seating preferences when booking.',
  },
]

export default async function BookTablePage() {
  await connection()
  const restaurantData = await getRestaurantProfileData()

  return (
    <>
      <Header />
      <main className="bg-[#F8F3EA]">
        <BookingHero profile={restaurantData.profile} />
        <BookingSection restaurantData={restaurantData} />
        <DiningDetails />
      </main>
      <Footer restaurantData={restaurantData} />
    </>
  )
}

function BookingHero({ profile }) {
  return (
    <section className="relative isolate min-h-[58svh] overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1920&q=90"
        alt="Warm restaurant table set for dinner"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/58 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

      <div className="site-container relative z-10 flex min-h-[58svh] items-center pt-24">
        <div className="max-w-2xl py-20">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-px w-8 bg-[#D4A017]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Reservations
            </span>
          </div>
          <h1 className="font-display text-[42px] font-bold leading-[1.05] text-white sm:text-6xl lg:text-[72px]">
            Reserve Your Table
            <span className="block text-[#D4A017]">at {profile.name}</span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/65 sm:text-base">
            Book a warm table for Vietnamese broths, grilled plates, fresh herbs, and a quiet evening in Kissonerga.
          </p>
        </div>
      </div>
    </section>
  )
}

function BookingSection({ restaurantData }) {
  const { profile, openingHours } = restaurantData
  const phoneNumbers = splitPhoneNumbers(profile.phone)
  const mapHref = profile.mapUrl || '/contact'
  const isExternalMap = /^https?:\/\//i.test(mapHref)

  return (
    <section className="py-16 lg:py-24">
      <div className="site-container">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="border border-[#E8DFC8] bg-[#FAF6EE] p-5 shadow-sm sm:p-8 lg:p-10">
            <div className="mb-8">
              <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
                Book Online
              </span>
              <h2 className="font-display text-4xl font-bold leading-tight text-[#2B2B2B] lg:text-[52px]">
                Tell us when you are coming.
              </h2>
              <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#6B6560]">
                Send your request and our team will confirm availability as soon as possible.
              </p>
            </div>
            <ReservationForm openingHours={openingHours} />
          </div>

          <aside className="space-y-6">
            <div className="border border-[#D4A017]/25 bg-[#1E1A18] p-6 text-white sm:p-8">
              <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
                Direct Contact
              </span>
              <h2 className="font-display text-3xl font-bold leading-tight">
                Prefer to call?
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-white/45">
                For same-day reservations, larger groups, or special requests, call us directly.
              </p>

              <div className="mt-6 space-y-3">
                {phoneNumbers.map((phone) => (
                  <a
                    key={phone}
                    href={phoneHref(phone)}
                    className="flex items-center gap-3 border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] font-semibold text-white transition-all hover:border-[#D4A017]/50 hover:bg-white/[0.06]"
                  >
                    <Phone className="size-4 text-[#D4A017]" aria-hidden="true" />
                    {phone}
                  </a>
                ))}
              </div>
            </div>

            <div className="border border-[#E8DFC8] bg-[#F2EAD8] p-6 sm:p-8">
              <h2 className="font-display text-3xl font-bold text-[#2B2B2B]">
                Opening Hours
              </h2>
              <ul className="mt-5 space-y-3">
                {openingHours.map((item) => (
                  <li key={item.day} className="flex items-baseline justify-between gap-4 border-b border-[#D4A017]/15 pb-3 last:border-b-0 last:pb-0">
                    <span className="text-[13px] text-[#6B6560]">{item.day}</span>
                    <span className="text-[13px] font-semibold text-[#2B2B2B]">{item.isClosed ? 'Closed' : item.hours}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-[#E8DFC8] bg-[#FAF6EE] p-6 sm:p-8">
              <h2 className="font-display text-3xl font-bold text-[#2B2B2B]">
                Find Us
              </h2>
              <div className="mt-5 space-y-4 text-[13px] leading-relaxed text-[#6B6560]">
                <a
                  href={mapHref}
                  target={isExternalMap ? '_blank' : undefined}
                  rel={isExternalMap ? 'noreferrer' : undefined}
                  className="flex items-start gap-3 transition-colors hover:text-[#2B2B2B]"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#8B1E1E]" aria-hidden="true" />
                  {profile.address}
                </a>
                <p className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-[#8B1E1E]" aria-hidden="true" />
                  We recommend booking ahead for dinner and weekend service.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

function DiningDetails() {
  return (
    <section className="bg-[#1E1A18] py-16 lg:py-20">
      <div className="site-container">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Dining Notes
            </span>
            <h2 className="font-display text-4xl font-bold leading-tight text-white lg:text-[52px]">
              A table for every kind of evening.
            </h2>
          </div>
          <Link
            href="/menu"
            className="self-start border-b border-[#D4A017]/40 pb-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#D4A017] transition-colors hover:border-[#D4A017]"
          >
            View Menu
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {diningNotes.map((item) => (
            <article key={item.title} className="border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-5 flex size-11 items-center justify-center bg-[#8B1E1E] text-white">
                {item.icon}
              </div>
              <h3 className="font-display text-2xl font-bold text-white">{item.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-white/45">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
