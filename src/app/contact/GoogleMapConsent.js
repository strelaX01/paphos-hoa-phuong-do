'use client'

import { useState } from 'react'
import { ExternalLink, MapPin, ShieldCheck } from 'lucide-react'

export default function GoogleMapConsent({ address, embedUrl, mapUrl, restaurantName }) {
  const [isLoaded, setIsLoaded] = useState(false)

  if (isLoaded) {
    return (
      <iframe
        title={`${restaurantName} location on Google Maps`}
        src={embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="h-[420px] w-full border-0 lg:h-[560px]"
      />
    )
  }

  return (
    <div className="flex h-[420px] w-full items-center justify-center bg-[#EEE6D7] px-6 text-center lg:h-[560px]">
      <div className="max-w-md">
        <div className="mx-auto flex size-14 items-center justify-center bg-[#8B1E1E] text-white">
          <MapPin className="size-6" aria-hidden="true" />
        </div>
        <h3 className="mt-5 font-display text-3xl font-bold text-[#2B2B2B]">View us on Google Maps</h3>
        <p className="mt-3 text-sm leading-6 text-[#6B6560]">{address}</p>
        <p className="mt-4 flex items-start justify-center gap-2 text-xs leading-5 text-[#766F67]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#8B1E1E]" aria-hidden="true" />
          Loading the map connects to Google and may allow Google to store cookies or process technical data.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => setIsLoaded(true)} className="inline-flex items-center justify-center bg-[#8B1E1E] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#a02424]">
            Load Google Map
          </button>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 border border-[#CFC2AE] bg-[#F8F3EA] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#2B2B2B] transition-colors hover:border-[#8B1E1E]">
            <ExternalLink className="size-4" aria-hidden="true" /> Open externally
          </a>
        </div>
      </div>
    </div>
  )
}
