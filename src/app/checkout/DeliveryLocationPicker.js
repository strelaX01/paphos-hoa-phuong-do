"use client"

import dynamic from "next/dynamic"
import { LocateFixed, LoaderCircle, MapPin, Search } from "lucide-react"
import { useCallback, useRef, useState } from "react"

const LocationMap = dynamic(() => import("@/app/components/shared/LocationMap"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse bg-[#E8DFC8] sm:h-[390px]" /> })

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || "Map service is temporarily unavailable.")
    error.code = payload.code || ""
    throw error
  }
  return payload
}

export default function DeliveryLocationPicker({ addressQuery, destination, onAddressSelected, onDestinationChange, onQuoteChange, quote }) {
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [message, setMessage] = useState("")
  const locationRequestRef = useRef(0)

  const calculateQuote = useCallback(async (point, options = {}) => {
    const { resolveAddress = true } = options
    const requestId = ++locationRequestRef.current
    const normalized = { latitude: Number(point.latitude), longitude: Number(point.longitude) }
    const mapArea = String(point.mapArea || "").trim().slice(0, 100)
    const mapStreet = String(point.mapStreet || "").trim().slice(0, 200)
    onDestinationChange(normalized)
    onQuoteChange(null)
    setQuoting(true)
    setMessage("")
    try {
      const [quoteResult, addressResult] = await Promise.allSettled([
        fetch("/api/delivery/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalized),
        }).then(readApi),
        resolveAddress
          ? fetch("/api/delivery/geocode/reverse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(normalized),
            }).then(readApi)
          : Promise.resolve(null),
      ])
      if (requestId !== locationRequestRef.current) return

      let nextMessage = ""
      if (resolveAddress) {
        const resolvedAddress = addressResult.status === "fulfilled" ? addressResult.value?.data : null
        const routeStreet = quoteResult.status === "fulfilled" ? String(quoteResult.value?.data?.destinationStreet || "").trim().slice(0, 200) : ""
        const preferredStreet = mapStreet || routeStreet
        if (resolvedAddress?.street || preferredStreet) {
          const street = preferredStreet || resolvedAddress.street
          const area = mapArea || resolvedAddress?.area || ""
          const postalCode = resolvedAddress?.postalCode || ""
          onAddressSelected({
            street,
            area,
            label: preferredStreet
              ? [street, area, postalCode, "Cyprus"].filter(Boolean).join(", ")
              : resolvedAddress.label || "",
            hasHouseNumber: !preferredStreet && resolvedAddress?.hasHouseNumber === true,
            postalCode,
          })
        } else {
          nextMessage = "Pin saved, but the exact street was not found. Please enter the address manually."
        }
      }

      if (quoteResult.status === "fulfilled") {
        onQuoteChange({ mode: "automatic", ...quoteResult.value.data })
      } else if (["ROUTING_UNAVAILABLE", "ROUTING_RATE_LIMITED"].includes(quoteResult.reason.code)) {
        onQuoteChange({ mode: "manual", latitude: normalized.latitude, longitude: normalized.longitude })
        nextMessage = "We saved your exact pin, but live routing is unavailable. The restaurant will confirm the fee by phone."
      } else {
        nextMessage = quoteResult.reason.message
      }
      setMessage(nextMessage)
    } finally {
      if (requestId === locationRequestRef.current) setQuoting(false)
    }
  }, [onAddressSelected, onDestinationChange, onQuoteChange])

  async function searchAddress() {
    if (addressQuery.trim().length < 3) return setMessage("Enter the street and area before searching.")
    setSearching(true)
    setMessage("")
    try {
      const payload = await fetch("/api/delivery/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: addressQuery }) }).then(readApi)
      setSuggestions(payload.data || [])
      if (!payload.data?.length) setMessage("No matching address was found. Add more detail or place the pin manually.")
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSearching(false)
    }
  }

  async function selectSuggestion(suggestion) {
    setSuggestions([])
    onAddressSelected({
      street: suggestion.street || suggestion.label,
      area: suggestion.area,
      label: suggestion.label || "",
      hasHouseNumber: suggestion.hasHouseNumber === true,
      postalCode: suggestion.postalCode || "",
    })
    await calculateQuote(suggestion, { resolveAddress: false })
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Current location is not supported by this browser. Search for the address or place the pin manually.")
      return
    }

    setLocating(true)
    setMessage("")
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await calculateQuote({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        } finally {
          setLocating(false)
        }
      },
      (error) => {
        setLocating(false)
        if (error.code === 1) {
          setMessage("Location permission was denied. Allow location access in your browser, or place the pin manually.")
          return
        }
        if (error.code === 3) {
          setMessage("Finding your location took too long. Try again, search for the address, or place the pin manually.")
          return
        }
        setMessage("Your current location could not be found. Try again or place the pin manually.")
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  return (
    <section className="overflow-hidden border border-[#E8DFC8] bg-white/55" aria-labelledby="delivery-location-title">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-[#8B1E1E] text-white"><MapPin className="size-5" /></div>
          <div><h2 id="delivery-location-title" className="font-display text-2xl font-bold text-[#2B2B2B]">Confirm the delivery point</h2><p className="mt-1 text-[13px] leading-relaxed text-[#6B6560]">Search your address, then drag the pin to the exact entrance. Distance and fee are calculated from this point.</p></div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={searchAddress} disabled={searching || locating || addressQuery.trim().length < 3} className="flex min-h-12 w-full items-center justify-center gap-2 border border-[#8B1E1E] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8B1E1E] transition-colors hover:bg-[#8B1E1E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
            {searching ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}{searching ? "Searching..." : "Find address on map"}
          </button>
          <button type="button" onClick={useCurrentLocation} disabled={locating || quoting} className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#8B1E1E] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#741818] disabled:cursor-not-allowed disabled:opacity-50">
            {locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}{locating ? "Locating..." : "Use current location"}
          </button>
        </div>
        {suggestions.length ? <div className="mt-2 divide-y divide-[#E8DFC8] border border-[#E8DFC8] bg-white" role="listbox" aria-label="Address suggestions">{suggestions.map((suggestion) => <button key={suggestion.id} type="button" onClick={() => selectSuggestion(suggestion)} className="block w-full px-4 py-3 text-left text-sm leading-relaxed text-[#2B2B2B] hover:bg-[#F2EAD8]" role="option" aria-selected="false">{suggestion.label}</button>)}</div> : null}
        {message ? <p className="mt-3 border-l-2 border-[#8B1E1E] bg-[#8B1E1E]/8 px-3 py-2 text-[12px] leading-relaxed text-[#7A1C1C]" role="status">{message}</p> : null}
      </div>
      <div className="relative border-t border-[#E8DFC8]">
        <LocationMap destination={destination} origin={quote?.origin} route={quote?.route || []} onChange={calculateQuote} showLocate={false} />
        {quoting ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65 backdrop-blur-[1px]"><div className="flex items-center gap-2 bg-[#1E1A18] px-4 py-3 text-sm text-white"><LoaderCircle className="size-4 animate-spin" />Calculating route...</div></div> : null}
      </div>
      {quote?.mode === "automatic" ? <div className="grid grid-cols-3 divide-x divide-[#E8DFC8] border-t border-[#E8DFC8] bg-[#FFF9E9] text-center"><Metric label="Distance" value={`${quote.distanceKm.toFixed(1)} km`} /><Metric label="Drive time" value={`~${quote.etaMinutes} min`} /><Metric label="Delivery fee" value={`€${quote.fee.toFixed(2)}`} /></div> : null}
      {destination && !quote && !quoting ? <p className="border-t border-[#E8DFC8] px-4 py-3 text-center text-xs text-[#8B1E1E]">Move the pin or search again to calculate a valid route.</p> : null}
    </section>
  )
}

function Metric({ label, value }) {
  return <div className="px-2 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8B6F47]">{label}</p><p className="mt-1 text-sm font-bold tabular-nums text-[#2B2B2B]">{value}</p></div>
}
