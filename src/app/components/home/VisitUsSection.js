import Link from 'next/link'
import { Clock, Mail, MapPin, Navigation, Phone } from 'lucide-react'

import { phoneHref, splitPhoneNumbers } from '@/lib/restaurantProfileData'

export default function VisitUsSection({ restaurantData, openingStatus }) {
  const profile = restaurantData?.profile
  if (!profile) return null

  const visitDetails = [
    { icon: MapPin, label: 'Address', values: [profile.address].filter(Boolean) },
    { icon: Clock, label: 'Today', values: [openingStatus?.text || 'See opening hours'] },
    { icon: Phone, label: 'Phone', values: splitPhoneNumbers(profile.phone), isPhone: true },
  ]

  return (
    <section id="visit-us" aria-label={`Visit ${profile.name}`} className="bg-[#1E1A18] py-18 lg:py-24">
      <div className="site-container">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">Visit Us</span>
            <h2 className="font-display text-4xl font-bold leading-[1.08] text-white sm:text-5xl lg:text-[56px]">Plan your visit.</h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/55">Join us for Vietnamese food in a relaxed dining room, or call ahead for your next visit.</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={profile.mapUrl || '/contact'} className="inline-flex items-center justify-center gap-2 bg-[#D4A017] px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#1E1A18] transition-colors hover:bg-[#e8c228]">
                <Navigation className="size-4" aria-hidden="true" /> Open Maps
              </a>
              {profile.phone ? (
                <a href={phoneHref(profile.phone)} className="inline-flex items-center justify-center gap-2 border border-white/15 px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:border-[#D4A017]/60 hover:text-[#D4A017]">
                  <Phone className="size-4" aria-hidden="true" /> Call Now
                </a>
              ) : null}
              {profile.email ? (
                <a href={`mailto:${profile.email}`} aria-label={`Email ${profile.email}`} className="inline-flex size-11 items-center justify-center border border-white/15 text-white transition-colors hover:border-[#D4A017]/60 hover:text-[#D4A017]">
                  <Mail className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {visitDetails.map(({ icon: Icon, isPhone, label, values }) => (
              <article key={label} className="border border-white/10 bg-white/[0.04] p-5 text-white shadow-sm">
                <div className="mb-5 flex size-10 items-center justify-center bg-[#8B1E1E] text-white"><Icon className="size-4" aria-hidden="true" /></div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D4A017]">{label}</p>
                <div className="mt-3 space-y-1 text-[14px] leading-relaxed text-white/70">
                  {values.length ? values.map((value) => isPhone ? (
                    <a key={value} href={phoneHref(value)} className="block whitespace-nowrap transition-colors hover:text-white">
                      {value}
                    </a>
                  ) : (
                    <p key={value} className="break-words">{value}</p>
                  )) : <p>Not provided</p>}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">Reserve a table or order delivery during service hours</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/book-table" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75 transition-colors hover:text-[#D4A017]">Book Table</Link>
            <Link href="/delivery" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75 transition-colors hover:text-[#D4A017]">Order Delivery</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
