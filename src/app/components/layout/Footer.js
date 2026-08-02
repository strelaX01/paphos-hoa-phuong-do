import Link from 'next/link'
import { connection } from 'next/server'
import {
  getRestaurantProfileData,
  phoneHref,
  splitPhoneNumbers,
} from '@/lib/restaurantProfileData'

const footerNav = {
  Explore: [
    { href: '/', label: 'Home' },
    { href: '/menu', label: 'Menu' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/contact', label: 'Contact' },
  ],
  Services: [
    { href: '/book-table', label: 'Book a Table' },
    { href: '/delivery', label: 'Order Delivery' },
  ],
}

export default async function Footer({ restaurantData }) {
  if (!restaurantData) await connection()

  const year = new Date().getFullYear()
  const { profile, openingHours } = restaurantData || await getRestaurantProfileData()
  const phoneNumbers = splitPhoneNumbers(profile.phone)
  const addressHref = profile.mapUrl || '/contact'
  const isExternalAddress = /^https?:\/\//i.test(addressHref)

  return (
    <footer id="site-footer" className="bg-[#1E1A18] text-white" role="contentinfo">
      <div className="h-px bg-gradient-to-r from-transparent via-[#D4A017]/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr] lg:gap-12 lg:py-16">
          <div>
            <p className="mb-0.5 font-display text-xl font-bold text-white">{profile.name}</p>
            <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-[#D4A017]">Vietnamese &middot; Cyprus</p>
            <p className="max-w-[230px] text-[13px] leading-relaxed text-white/35">
              Authentic Vietnamese cuisine crafted with passion. Served with genuine hospitality in Paphos, Cyprus.
            </p>
          </div>

          {Object.entries(footerNav).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">
                {heading}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-white/50 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30">
              Opening Hours
            </h3>
            <ul className="mb-6 space-y-3">
              {openingHours.map((entry) => (
                <li key={entry.id || entry.day} className="flex items-baseline justify-between gap-4">
                  <span className="whitespace-nowrap text-[12px] text-white/35">{entry.day}</span>
                  <span className="whitespace-nowrap text-[12px] font-medium text-white/60">
                    {entry.isClosed ? 'Closed' : entry.hours}
                  </span>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t border-white/[0.07] pt-5">
              {phoneNumbers.map((phone) => (
                <a
                  key={phone}
                  href={phoneHref(phone)}
                  className="flex items-center gap-2 text-[13px] text-white/45 transition-colors duration-200 hover:text-white/80"
                >
                  <svg className="h-3 w-3 flex-shrink-0 text-[#D4A017]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                  {phone}
                </a>
              ))}

              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-2 break-all text-[13px] text-white/45 transition-colors duration-200 hover:text-white/80"
                >
                  <svg className="h-3 w-3 flex-shrink-0 text-[#D4A017]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  {profile.email}
                </a>
              )}

              {profile.address && (
                <a
                  href={addressHref}
                  target={isExternalAddress ? '_blank' : undefined}
                  rel={isExternalAddress ? 'noreferrer' : undefined}
                  className="flex items-start gap-2 text-[13px] text-white/45 transition-colors duration-200 hover:text-white/80"
                >
                  <svg className="mt-0.5 h-3 w-3 flex-shrink-0 text-[#D4A017]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  {profile.address}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] py-5 sm:flex-row">
          <p className="text-center text-[11px] text-white/20">
            &copy; {year} {profile.name}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/privacy-policy" className="text-[11px] text-white/35 transition-colors hover:text-white/75">Privacy</Link>
            <Link href="/terms-and-conditions" className="text-[11px] text-white/35 transition-colors hover:text-white/75">Terms</Link>
            <Link href="/cookie-policy" className="text-[11px] text-white/35 transition-colors hover:text-white/75">Cookies</Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}
