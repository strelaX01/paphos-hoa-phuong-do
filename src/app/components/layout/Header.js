'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import CartButton from '@/app/components/shared/CartButton'
import { NAV_LINKS as navLinks } from '@/lib/constants/index.js'

function FlamboyantIcon({ className }) {
  return (
    <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="17" cy="17" r="16" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" />
      <path d="M17 4 C19 10, 23 13, 17 17 C11 13, 15 10, 17 4Z" fill="#C41E3A" opacity="0.9" />
      <path d="M30 17 C24 19, 21 23, 17 17 C21 11, 24 15, 30 17Z" fill="#C41E3A" opacity="0.75" />
      <path d="M17 30 C15 24, 11 21, 17 17 C23 21, 19 24, 17 30Z" fill="#C41E3A" opacity="0.9" />
      <path d="M4 17 C10 15, 13 11, 17 17 C13 23, 10 19, 4 17Z" fill="#C41E3A" opacity="0.75" />
      <circle cx="17" cy="17" r="2.5" fill="#D4A017" />
    </svg>
  )
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const NO_HERO_ROUTES = ['/checkout']
  const forceSolid = NO_HERO_ROUTES.some((route) => pathname.startsWith(route))
  const solidStyle = isScrolled || forceSolid

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  return (
    <>
      {/* ── Header bar ─────────────────────────────────── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        solidStyle
          ? 'bg-[#FAF6EE]/97 backdrop-blur-md border-b border-[#EDE5D0]'
          : 'bg-transparent'
      }`}>
        <div className="site-container px-5 lg:px-8">
          <div className={`flex items-center justify-between gap-8 transition-[height] duration-500 ${isScrolled ? 'h-[68px]' : 'h-[80px]'}`}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 flex-shrink-0 focus-visible:outline-none" aria-label="Hoa Phuong Do">
              <Image
                src="/images/hoa-phuong-do-logo.png"
                alt="Hoa Phuong Do"
                width={50}  
                height={50}
                priority
                className='w-auto h-15'
              />
            </Link>

            {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6 lg:gap-8 flex-1 justify-center" aria-label="Main navigation">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-[13px] font-normal transition-colors duration-200 group focus-visible:outline-none ${
                      isActive
                        ? solidStyle ? 'text-[#1A1410]' : 'text-white'
                        : solidStyle
                          ? 'text-[#6B645A] hover:text-[#1A1410]'
                          : 'text-white/65 hover:text-white'
                    }`}
                  >
                    {link.label}
                    <span className={`absolute bottom-0 inset-x-4 h-px bg-[#D4A017] transition-transform duration-200 origin-left ${
                      isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`} />
                  </Link>
                )
              })}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
              <CartButton isScrolled={solidStyle} />
              <Link
                href="/delivery"
                className={`text-[12px] font-medium px-4 py-2 transition-colors duration-200 ${
                  solidStyle ? 'text-[#6B645A] hover:text-[#1A1410]' : 'text-white/65 hover:text-white'
                }`}
              >
                Order Online
              </Link>
              <Link
                href="/book-table"
                className={`text-[12px] font-medium px-5 py-2.5 transition-all duration-200 ${
                  solidStyle
                    ? 'bg-[#C41E3A] text-white hover:bg-[#9B1530]'
                    : 'border border-white/40 text-white hover:bg-white/10'
                }`}
              >
                Reserve a Table
              </Link>
            </div>

            <div className="lg:hidden flex items-center gap-1">
              <CartButton isScrolled={solidStyle} />
              {/* Mobile hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`flex flex-col justify-center items-center w-9 h-9 gap-[5px] focus-visible:outline-none ${
                  solidStyle ? 'text-[#1A1410]' : 'text-white'
                }`}
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                <span className={`block w-[22px] h-px bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-[6px]' : ''}`} />
                <span className={`block w-[22px] h-px bg-current transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : ''}`} />
                <span className={`block w-[22px] h-px bg-current transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-[6px]' : ''}`} />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Backdrop */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 z-[65] lg:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Mobile slide-in panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed top-0 right-0 bottom-0 z-[70] lg:hidden w-[300px] bg-[#FAF6EE] flex flex-col shadow-xl transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EDE5D0]">
          <div>
            <p className="text-[#1A1410] text-[15px]" style={{ fontFamily: 'var(--font-display-local)' }}>
              Hoa Phượng Đỏ
            </p>
            <p className="text-[#D4A017] uppercase mt-0.5" style={{ fontSize: '9px', letterSpacing: '0.25em' }}>
              Vietnamese · Cyprus
            </p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center text-[#6B645A] hover:text-[#C41E3A] transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto" aria-label="Mobile navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-6 py-4 text-[13px] border-b border-[#EDE5D0] transition-colors duration-150 ${
                  isActive ? 'text-[#C41E3A]' : 'text-[#1A1410] hover:text-[#C41E3A]'
                }`}
              >
                {link.label}
                <svg className="w-4 h-4 text-[#C8BFA8] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            )
          })}
        </nav>

        {/* CTAs */}
        <div className="px-6 py-5 border-t border-[#EDE5D0] space-y-3">
          <Link href="/book-table" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center w-full py-3 bg-[#C41E3A] text-white text-[12px] font-medium tracking-wide hover:bg-[#9B1530] transition-colors">
            Reserve a Table
          </Link>
          <Link href="/delivery" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center w-full py-3 border border-[#EDE5D0] text-[#1A1410] text-[12px] font-medium tracking-wide hover:border-[#C41E3A] hover:text-[#C41E3A] transition-all">
            Order Delivery
          </Link>
        </div>
      </div>
    </>
  )
}
