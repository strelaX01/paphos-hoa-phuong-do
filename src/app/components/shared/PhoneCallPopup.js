'use client'

import { Phone } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

function phoneHref(phone) {
  const normalized = String(phone || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  return normalized ? `tel:${normalized}` : '#'
}

export default function PhoneCallPopup({ phoneNumbers = [], restaurantName = 'the restaurant' }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  if (pathname?.startsWith('/admin') || !phoneNumbers.length) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60] hidden flex-col items-end gap-3 sm:flex">
      <div
        id="phone-call-options"
        className={`flex origin-bottom-right flex-col gap-2 transition-all duration-200 ${
          isOpen
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0'
        }`}
      >
        {phoneNumbers.map((phone) => (
          <a
            key={phone}
            href={phoneHref(phone)}
            className="flex items-center gap-3 rounded-full border border-[#D4A017]/40 bg-[#FAF6EE] py-2 pl-3 pr-4 text-[13px] font-semibold text-[#2B2B2B] shadow-xl shadow-black/15 transition-all hover:border-[#D4A017] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]/70"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[#8B1E1E] text-white">
              <Phone className="size-4" aria-hidden="true" />
            </span>
            {phone}
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="phone-call-float group relative flex size-11 items-center justify-center rounded-full bg-[#8B1E1E] text-white shadow-2xl shadow-black/25 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]/80 sm:size-16"
        aria-expanded={isOpen}
        aria-controls="phone-call-options"
        aria-label={`Choose a phone number to call ${restaurantName}`}
      >
        <span className="relative flex size-9 items-center justify-center rounded-full border border-white/20 bg-[#A51F1F] sm:size-12">
          <Phone className="size-5 transition-transform duration-200 group-hover:-rotate-12 sm:size-6" aria-hidden="true" />
        </span>
      </button>
    </div>
  )
}
