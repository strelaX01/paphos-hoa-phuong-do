import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'
import { ArrowUpRight, CalendarDays, Mail, MapPin, Phone, ShoppingBag } from 'lucide-react'
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
    <footer id="site-footer" className="border-t border-[#D4A017]/35 bg-[#1E1A18] text-white" role="contentinfo">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-7 border-b border-white/10 py-9 md:grid-cols-[1fr_auto] md:items-center lg:py-11">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#D4A017]">Vietnamese dining in Paphos</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight text-white sm:text-4xl">A warm table, honest flavours, and food made to share.</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link href="/book-table" className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#A31F24] px-4 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#BF2930] sm:px-5">
              <CalendarDays className="size-4" />Book a table
            </Link>
            <Link href="/delivery" className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/25 px-4 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-[#D4A017] hover:text-[#F2C94C] sm:px-5">
              <ShoppingBag className="size-4" />Order food
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 py-10 lg:grid-cols-12 lg:gap-x-10 lg:py-14">
          <section className="col-span-2 border-b border-white/10 pb-8 lg:col-span-4 lg:border-b-0 lg:pb-0" aria-labelledby="footer-restaurant">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center bg-[#F8F3E9] p-2">
                <Image src="/images/hoa-phuong-do-logo.png" alt="" width={96} height={64} className="h-auto w-full object-contain" />
              </div>
              <div>
                <h2 id="footer-restaurant" className="font-display text-2xl leading-none text-white">{profile.name}</h2>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4A017]">Vietnamese &amp; Asian cuisine</p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-6 text-white/65">Authentic Vietnamese cooking, fresh ingredients, and welcoming hospitality in Kissonerga.</p>
            <div className="mt-6 space-y-3">
              {profile.address && <a href={addressHref} target={isExternalAddress ? '_blank' : undefined} rel={isExternalAddress ? 'noopener noreferrer' : undefined} className="group flex items-start gap-3 text-sm leading-6 text-white/70 transition-colors hover:text-white"><MapPin className="mt-1 size-4 shrink-0 text-[#D4A017]" /><span>{profile.address}</span>{isExternalAddress ? <ArrowUpRight className="mt-1 size-3.5 shrink-0 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /> : null}</a>}
              {phoneNumbers.map((phone) => <a key={phone} href={phoneHref(phone)} className="flex items-center gap-3 text-sm text-white/70 transition-colors hover:text-white"><Phone className="size-4 shrink-0 text-[#D4A017]" />{phone}</a>)}
              {profile.email && <a href={`mailto:${profile.email}`} className="flex items-center gap-3 break-all text-sm text-white/70 transition-colors hover:text-white"><Mail className="size-4 shrink-0 text-[#D4A017]" />{profile.email}</a>}
            </div>
          </section>

          {Object.entries(footerNav).map(([heading, links]) => (
            <nav key={heading} aria-label={heading} className="border-b border-white/10 py-8 lg:col-span-2 lg:border-b-0 lg:py-0">
              <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">{heading}</h3>
              <ul className="space-y-3.5">
                {links.map((link) => <li key={link.href}><Link href={link.href} className="group inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-[#F2C94C]">{link.label}<ArrowUpRight className="size-3 opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" /></Link></li>)}
              </ul>
            </nav>
          ))}

          <section className="col-span-2 pt-8 lg:col-span-4 lg:pt-0" aria-labelledby="footer-hours">
            <h3 id="footer-hours" className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Opening hours</h3>
            <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {openingHours.map((entry) => <li key={entry.id || entry.day} className="flex min-h-10 items-center justify-between gap-5 text-sm"><span className="text-white/60">{entry.day}</span><span className={`whitespace-nowrap font-medium ${entry.isClosed ? 'text-[#E79A9D]' : 'text-white'}`}>{entry.isClosed ? 'Closed' : entry.hours}</span></li>)}
            </ul>
          </section>
        </div>

        <div className="grid gap-4 border-t border-white/10 py-5 text-[11px] text-white/45 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            <p>&copy; {year} {profile.name}. All rights reserved.</p>
            <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/privacy-policy" className="transition-colors hover:text-white">Privacy</Link>
              <Link href="/terms-and-conditions" className="transition-colors hover:text-white">Terms</Link>
              <Link href="/cookie-policy" className="transition-colors hover:text-white">Cookies</Link>
            </nav>
          </div>
          <a href="https://www.slavasoft.tech/" target="_blank" rel="noopener noreferrer" className="group inline-flex w-fit items-center gap-1.5 text-white/55 transition-colors hover:text-[#F2C94C]">Website by <span className="font-semibold text-white/80 group-hover:text-[#F2C94C]">SlavaSoft</span><ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a>
        </div>
      </div>
    </footer>
  )
}
