"use client"

import dynamic from "next/dynamic"
import { LocateFixed, LoaderCircle, MapPin } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

const LocationMap = dynamic(() => import("@/app/components/shared/LocationMap"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse bg-[#E8DFC8] sm:h-[390px]" /> })
const MAX_AUTO_LOCATION_ACCURACY_METERS = 80

function coordinateKey(point) {
  return `${Number(point?.latitude).toFixed(5)}:${Number(point?.longitude).toFixed(5)}`
}

function resolvedLabel(address) {
  return [address.street, address.area, address.postalCode, "Cyprus"].filter(Boolean).join(", ")
}

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || "Map service is temporarily unavailable.")
    error.code = payload.code || ""
    throw error
  }
  return payload
}

export default function DeliveryLocationPicker({ destination, onAddressSelected, onDestinationChange, onQuoteChange, quote, subtotal }) {
  const [locating, setLocating] = useState(false)
  const [quoting, setQuoting] = useState(false)
  const [message, setMessage] = useState("")
  const [locationAccuracy, setLocationAccuracy] = useState(null)
  const locationRequestRef = useRef(0)
  const currentPointKeyRef = useRef("")
  const latestAddressRef = useRef(null)
  const previousSubtotalRef = useRef(Math.round(Number(subtotal || 0) * 100))

  const calculateQuote = useCallback(async (point, options = {}) => {
    const { preserveAccuracy = false, resolveAddress = true } = options
    const requestId = ++locationRequestRef.current
    const normalized = { latitude: Number(point.latitude), longitude: Number(point.longitude) }
    const pointKey = coordinateKey(normalized)
    if (pointKey !== currentPointKeyRef.current) {
      currentPointKeyRef.current = pointKey
      latestAddressRef.current = null
    }
    const reportedAccuracy = Number(point.accuracy)
    if (!preserveAccuracy) setLocationAccuracy(Number.isFinite(reportedAccuracy) ? reportedAccuracy : null)
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
          body: JSON.stringify({ ...normalized, subtotal: Number(subtotal || 0) }),
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
          const area = mapArea || resolvedAddress?.area || latestAddressRef.current?.area || ""
          const postalCode = resolvedAddress?.postalCode || ""
          const nextAddress = {
            street,
            area,
            label: preferredStreet || area ? resolvedLabel({ street, area, postalCode }) : resolvedAddress.label || "",
            hasHouseNumber: !preferredStreet && resolvedAddress?.hasHouseNumber === true,
            postalCode,
          }
          latestAddressRef.current = nextAddress
          onAddressSelected(nextAddress)
        } else {
          nextMessage = "Pin saved, but the exact street was not found. Please enter the address manually."
        }
      }

      if (quoteResult.status === "fulfilled") {
        onQuoteChange({
          mode: "automatic",
          ...quoteResult.value.data,
          requiresPinAdjustment: Number.isFinite(reportedAccuracy) && reportedAccuracy > MAX_AUTO_LOCATION_ACCURACY_METERS,
        })
      } else if (["ROUTING_UNAVAILABLE", "ROUTING_RATE_LIMITED"].includes(quoteResult.reason.code)) {
        onQuoteChange({
          mode: "manual",
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          requiresPinAdjustment: Number.isFinite(reportedAccuracy) && reportedAccuracy > MAX_AUTO_LOCATION_ACCURACY_METERS,
        })
        nextMessage = "We saved your exact pin, but live routing is unavailable. The restaurant will confirm the fee by phone."
      } else {
        nextMessage = quoteResult.reason.message
      }
      if (!nextMessage && Number.isFinite(reportedAccuracy)) {
        const roundedAccuracy = Math.max(1, Math.round(reportedAccuracy))
        nextMessage = reportedAccuracy <= 40
          ? `Location accuracy is about ${roundedAccuracy} m. Check that the pin is at the correct entrance.`
          : `Your device could only locate you within about ${roundedAccuracy} m. Drag the pin to the exact entrance before ordering.`
      }
      setMessage(nextMessage)
    } finally {
      if (requestId === locationRequestRef.current) setQuoting(false)
    }
  }, [onAddressSelected, onDestinationChange, onQuoteChange, subtotal])

  useEffect(() => {
    const subtotalCents = Math.round(Number(subtotal || 0) * 100)
    if (subtotalCents === previousSubtotalRef.current) return
    previousSubtotalRef.current = subtotalCents
    if (!destination || quote?.mode !== "automatic") return
    const qualifiesForFreeDelivery = quote.freeDelivery?.enabled === true
      && quote.distanceKm <= quote.freeDelivery.maximumKm
      && subtotalCents >= quote.freeDelivery.minimumOrderCents
    const feeCents = qualifiesForFreeDelivery
      ? 0
      : quote.distanceKm <= quote.nearbyMaxKm ? quote.nearbyFeeCents : quote.fartherFeeCents
    onQuoteChange({
      ...quote,
      feeCents,
      fee: feeCents / 100,
      tier: qualifiesForFreeDelivery ? "free" : quote.distanceKm <= quote.nearbyMaxKm ? "nearby" : "farther",
      freeDelivery: {
        ...quote.freeDelivery,
        qualifies: qualifiesForFreeDelivery,
        remainingCents: quote.freeDelivery?.enabled && quote.distanceKm <= quote.freeDelivery.maximumKm
          ? Math.max(0, quote.freeDelivery.minimumOrderCents - subtotalCents)
          : null,
      },
    })
  }, [destination, onQuoteChange, quote, subtotal])

  const applyMapMetadata = useCallback((metadata) => {
    if (coordinateKey(metadata) !== currentPointKeyRef.current) return
    const mapArea = String(metadata.mapArea || "").trim().slice(0, 100)
    const mapStreet = String(metadata.mapStreet || "").trim().slice(0, 200)
    const current = latestAddressRef.current || {}
    if ((!mapArea || current.area) && (!mapStreet || current.street)) return
    const nextAddress = {
      ...current,
      street: current.street || mapStreet,
      area: current.area || mapArea,
      postalCode: current.postalCode || "",
      hasHouseNumber: current.hasHouseNumber === true,
    }
    nextAddress.label = resolvedLabel(nextAddress)
    latestAddressRef.current = nextAddress
    onAddressSelected(nextAddress)
  }, [onAddressSelected])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Current location is not supported by this browser. Tap the map to place the pin manually.")
      return
    }

    setLocating(true)
    setMessage("")
    getBestCurrentPosition()
      .then((position) => calculateQuote({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }))
      .catch((error) => {
        if (error.code === 1) {
          setMessage("Location permission was denied. Allow location access in your browser, or place the pin manually.")
          return
        }
        if (error.code === 3) {
          setMessage("Finding your location took too long. Try again or place the pin manually.")
          return
        }
        setMessage("Your current location could not be found. Try again or place the pin manually.")
      })
      .finally(() => setLocating(false))
  }

  return (
    <section className="overflow-hidden border border-[#E8DFC8] bg-white/55" aria-labelledby="delivery-location-title">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-[#8B1E1E] text-white"><MapPin className="size-5" /></div>
          <div><h2 id="delivery-location-title" className="font-display text-2xl font-bold text-[#2B2B2B]">Confirm the delivery point</h2><p className="mt-1 text-[13px] leading-relaxed text-[#6B6560]">Use your current location or tap the map, then drag the pin to the exact entrance. Distance and fee are calculated from the pin.</p></div>
        </div>
        <div className="mt-4">
          <button type="button" onClick={useCurrentLocation} disabled={locating || quoting} className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#8B1E1E] px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#741818] disabled:cursor-not-allowed disabled:opacity-50">
            {locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}{locating ? "Locating..." : "Use current location"}
          </button>
        </div>
        {message ? <p className="mt-3 border-l-2 border-[#8B1E1E] bg-[#8B1E1E]/8 px-3 py-2 text-[12px] leading-relaxed text-[#7A1C1C]" role="status">{message}</p> : null}
      </div>
      <div className="relative border-t border-[#E8DFC8]">
        <LocationMap accuracy={locationAccuracy} destination={destination} origin={quote?.origin} route={quote?.route || []} onChange={calculateQuote} onMetadata={applyMapMetadata} showLocate={false} />
        {quoting ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65 backdrop-blur-[1px]"><div className="flex items-center gap-2 bg-[#1E1A18] px-4 py-3 text-sm text-white"><LoaderCircle className="size-4 animate-spin" />Calculating route...</div></div> : null}
      </div>
      {quote?.mode === "automatic" ? <><div className="grid grid-cols-3 divide-x divide-[#E8DFC8] border-t border-[#E8DFC8] bg-[#FFF9E9] text-center"><Metric label="Distance" value={`${quote.distanceKm.toFixed(1)} km`} /><Metric label="Drive time" value={`~${quote.etaMinutes} min`} /><Metric label="Delivery fee" value={quote.feeCents === 0 ? "Free" : `€${quote.fee.toFixed(2)}`} /></div>{quote.freeDelivery?.remainingCents > 0 ? <p className="border-t border-[#E8DFC8] bg-[#FFF9E9] px-4 py-3 text-center text-xs text-[#6B6560]">Add €{(quote.freeDelivery.remainingCents / 100).toFixed(2)} more to qualify for free delivery on this route.</p> : null}</> : null}
      {destination && !quote && !quoting ? <p className="border-t border-[#E8DFC8] px-4 py-3 text-center text-xs text-[#8B1E1E]">Move the pin to calculate a valid route.</p> : null}
    </section>
  )
}

function Metric({ label, value }) {
  return <div className="px-2 py-3"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8B6F47]">{label}</p><p className="mt-1 text-sm font-bold tabular-nums text-[#2B2B2B]">{value}</p></div>
}

function getBestCurrentPosition() {
  return new Promise((resolve, reject) => {
    let bestPosition = null
    let settled = false
    let watchId
    let timeoutId

    const finish = (position, error) => {
      if (settled) return
      settled = true
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
      window.clearTimeout(timeoutId)
      if (position) resolve(position)
      else reject(error || { code: 2 })
    }

    timeoutId = window.setTimeout(() => finish(bestPosition, { code: 3 }), 8_000)
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const accuracy = Number(position.coords.accuracy)
        const bestAccuracy = Number(bestPosition?.coords.accuracy)
        if (!bestPosition || (Number.isFinite(accuracy) && (!Number.isFinite(bestAccuracy) || accuracy < bestAccuracy))) bestPosition = position
        if (Number.isFinite(accuracy) && accuracy <= 40) finish(position)
      },
      (error) => {
        if (error.code === 1 || !bestPosition) finish(null, error)
        else finish(bestPosition)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  })
}
