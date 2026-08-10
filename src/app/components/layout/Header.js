'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, CalendarDays, Menu, X } from 'lucide-react'
import CartButton from '@/app/components/shared/CartButton'
import { NAV_LINKS as navLinks } from '@/lib/constants/index.js'

const NO_HERO_ROUTES = ['/checkout']

function routeIsActive(pathname, href) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileDialogRef = useRef(null)
  const pathname = usePathname()

  const forceSolid = NO_HERO_ROUTES.some((route) => pathname.startsWith(route))
  const solidStyle = isScrolled || forceSolid

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 42)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    mobileDialogRef.current?.focus({ preventScroll: true })

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-500 ${
          solidStyle
            ? 'border-b border-[#dfd3bd] bg-[#faf6ee]/95 shadow-[0_10px_35px_rgba(35,25,17,0.06)] backdrop-blur-xl'
            : 'border-b border-transparent bg-[#15110e]/20 backdrop-blur-[3px]'
        }`}
      >
        <div className="site-container">
          <div className={`flex items-center justify-between gap-5 transition-[height] duration-500 ${isScrolled ? 'h-[68px]' : 'h-[82px]'}`}>
            <Link
              href="/"
              className="group relative z-10 flex shrink-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017]"
              aria-label="Hoa Phuong Do home"
            >
              <Image
                src="/images/hoa-phuong-do-logo.png"
                alt="Hoa Phuong Do"
                width={102}
                height={66}
                priority
                className={`h-[68px] w-auto object-contain transition-[transform,filter] duration-500 group-hover:scale-[1.03] ${solidStyle ? '' : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]'}`}
              />
            </Link>

            <nav className="hidden min-w-0 flex-1 items-stretch justify-center lg:flex" aria-label="Main navigation">
              {navLinks.map((link, index) => {
                const isActive = routeIsActive(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`header-nav-link group relative flex h-[52px] min-w-[76px] items-center justify-center px-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4a017] xl:min-w-[88px] ${
                      isActive
                        ? solidStyle ? 'text-[#211a15]' : 'text-white'
                        : solidStyle ? 'text-[#756c61] hover:text-[#211a15]' : 'text-white/70 hover:text-white'
                    }`}
                    style={{ '--nav-delay': `${80 + index * 55}ms` }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="font-[family-name:var(--font-display-local)] text-[17px] font-semibold leading-none">{link.label}</span>
                    <span className={`header-nav-line absolute inset-x-3 bottom-0 h-[2px] origin-left bg-[#c99a18] ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                  </Link>
                )
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 lg:gap-3">
              <CartButton isScrolled={solidStyle} />
              <Link
                href="/book-table"
                className={`header-reserve group relative hidden h-11 items-center overflow-hidden border px-4 text-[11px] font-bold uppercase tracking-[0.08em] transition-colors duration-300 lg:flex xl:px-5 ${
                  solidStyle
                    ? 'border-[#9d2023] text-white'
                    : 'border-white/55 text-white hover:border-[#d4a017]'
                }`}
              >
                <span className={`header-reserve-fill absolute inset-0 ${solidStyle ? 'translate-x-0 bg-[#9d2023]' : '-translate-x-full bg-[#9d2023] group-hover:translate-x-0'}`} />
                <CalendarDays className="relative mr-2 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                <span className="relative">Reserve</span>
                <ArrowUpRight className="relative ml-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.8} aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className={`grid h-10 w-10 place-items-center border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017] lg:hidden ${
                  solidStyle ? 'border-[#dfd3bd] text-[#211a15]' : 'border-white/35 text-white'
                }`}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-navigation"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[65] bg-[#160f0c]/62 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          isMobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <div
        ref={mobileDialogRef}
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen}
        tabIndex={-1}
        className={`fixed bottom-0 right-0 top-0 z-[70] flex w-[min(88vw,370px)] flex-col overflow-hidden bg-[#fbf8f2] shadow-[-24px_0_60px_rgba(20,13,9,0.2)] outline-none transition-transform duration-[450ms] lg:hidden ${
          isMobileMenuOpen ? 'hpd-mobile-menu-open translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-[78px] shrink-0 items-center justify-between border-b border-[#e4dac9] px-6">
          <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center" aria-label="Hoa Phuong Do home">
            <Image src="/images/hoa-phuong-do-logo.png" alt="Hoa Phuong Do" width={100} height={64} className="h-[62px] w-auto object-contain" />
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="grid h-10 w-10 place-items-center border border-[#d9cdbb] text-[#2b241e] transition-colors hover:border-[#9d2023] hover:text-[#9d2023] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017]"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <nav className="flex min-h-0 flex-1 flex-col px-7 pb-5 pt-8" aria-label="Mobile navigation">
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#9d2023]">Navigation</p>
            {navLinks.map((link, index) => {
              const isActive = routeIsActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`hpd-mobile-nav-item group relative flex min-h-[54px] items-center border-b border-[#e4dac9] py-2 pl-4 transition-colors ${
                    isActive ? 'text-[#9d2023]' : 'text-[#2b241e] hover:text-[#9d2023]'
                  }`}
                  style={{ '--mobile-nav-delay': `${110 + index * 60}ms` }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={`absolute inset-y-3.5 left-0 w-[3px] origin-center bg-[#9d2023] transition-transform duration-300 ${isActive ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'}`} />
                  <span className="text-[17px] font-medium leading-none">
                    {link.label}
                  </span>
                  <ArrowUpRight className={`ml-auto h-4 w-4 transition-[transform,opacity] duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100'}`} strokeWidth={1.6} aria-hidden="true" />
                </Link>
              )
            })}
          </nav>

          <div className="hpd-mobile-nav-item shrink-0 border-t border-[#e4dac9] px-7 py-6" style={{ '--mobile-nav-delay': '470ms' }}>
            <Link href="/book-table" onClick={() => setIsMobileMenuOpen(false)} className="flex min-h-[52px] items-center justify-center bg-[#9d2023] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#821a1d]">
              <CalendarDays className="mr-2.5 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              Reserve a table
            </Link>
            <Link href="/delivery" onClick={() => setIsMobileMenuOpen(false)} className="mt-3 flex min-h-[48px] items-center justify-center border border-[#cfc1ad] px-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#2b241e] transition-colors hover:border-[#9d2023] hover:text-[#9d2023]">
              Order delivery
              <ArrowUpRight className="ml-2 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
