"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LoaderCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import CopyReferenceButton from "@/app/components/shared/CopyReferenceButton"
import FormErrorNotice from "@/app/components/shared/FormErrorNotice"
import DeliveryLocationPicker from "./DeliveryLocationPicker"
import { useCart } from "@/hooks/useCart"
import { buildDeliveryFeeConsentText, DELIVERY_CONFIG, getDeliveryAvailability, getDeliveryAvailabilityMessage } from "@/lib/deliveryConfig"
import { getCartItemKey } from "@/lib/stores/cartStore"

function formatMoney(value) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: DELIVERY_CONFIG.currency }).format(Number(value || 0))
}

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors)[0] : null
    const error = new Error(firstError || payload.error || "Could not place the order.")
    error.unavailableItems = payload.unavailableItems || []
    error.code = payload.code || ""
    error.deliveryPricing = payload.deliveryPricing || null
    error.deliveryQuote = payload.deliveryQuote || null
    throw error
  }
  return payload
}

export default function CheckoutClient({ initialAvailability, openingHours }) {
  const router = useRouter()
  const cart = useCart()
  const formRef = useRef(null)
  const stepHeadingRef = useRef(null)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [isPending, setIsPending] = useState(false)
  const [result, setResult] = useState(null)
  const [contact, setContact] = useState({ name: "", phone: "", email: "" })
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [deliveryFeeAccepted, setDeliveryFeeAccepted] = useState(false)
  const [address, setAddress] = useState({ street: "", details: "", area: "", label: "", hasHouseNumber: null, postalCode: "" })
  const [destination, setDestination] = useState(null)
  const [deliveryQuote, setDeliveryQuote] = useState(null)
  const [deliveryAvailability, setDeliveryAvailability] = useState(initialAvailability)
  const pricingReady = cart.deliveryPricingStatus === "ready"
  const orderingOpen = deliveryAvailability?.isOpen === true
  const availabilityMessage = getDeliveryAvailabilityMessage(deliveryAvailability)
  const locationReady = Boolean(destination && deliveryQuote)
  const canPlaceOrder = !isPending && Boolean(cart.items.length) && deliveryFeeAccepted && pricingReady && orderingOpen && locationReady
  const deliveryFeeConsentText = deliveryQuote?.mode === "automatic"
    ? `I agree to the calculated delivery fee of ${formatMoney(deliveryQuote.fee)} for this ${deliveryQuote.distanceKm.toFixed(1)} km route and the pinned delivery point shown above.`
    : buildDeliveryFeeConsentText(Math.round(cart.nearbyDeliveryFee * 100), Math.round(cart.fartherDeliveryFee * 100))

  function updateAddress(field, value) {
    if (field === "details") {
      setAddress((current) => ({ ...current, details: value }))
      return
    }
    setAddress((current) => ({ ...current, [field]: value, label: "", hasHouseNumber: null, postalCode: "" }))
    setDestination(null)
    setDeliveryQuote(null)
    setDeliveryFeeAccepted(false)
  }

  function updateContact(field, value) {
    setContact((current) => ({ ...current, [field]: value }))
  }

  function applyResolvedAddress(nextAddress) {
    setAddress({
      street: String(nextAddress?.street || ""),
      details: String(nextAddress?.details || ""),
      area: String(nextAddress?.area || ""),
      label: String(nextAddress?.label || ""),
      hasHouseNumber: nextAddress?.hasHouseNumber === true,
      postalCode: String(nextAddress?.postalCode || ""),
    })
  }

  function focusStepHeading() {
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true })
      stepHeadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  function goToDeliveryStep() {
    const contactFields = ["name", "phone", "email"]
      .map((name) => formRef.current?.elements.namedItem(name))
      .filter(Boolean)
    const invalidField = contactFields.find((field) => !field.checkValidity())
    if (invalidField) {
      invalidField.reportValidity()
      invalidField.focus()
      return
    }
    setResult(null)
    setCheckoutStep(2)
    focusStepHeading()
  }

  function goToContactStep() {
    setCheckoutStep(1)
    focusStepHeading()
  }

  function updateQuote(quote) {
    setDeliveryQuote(quote)
    setDeliveryFeeAccepted(false)
  }

  useEffect(() => {
    const updateAvailability = () => setDeliveryAvailability(getDeliveryAvailability(openingHours))
    const timer = window.setInterval(updateAvailability, 30_000)
    return () => window.clearInterval(timer)
  }, [openingHours])

  async function handleSubmit(event) {
    event.preventDefault()
    if (checkoutStep === 1) {
      goToDeliveryStep()
      return
    }
    if (!canPlaceOrder) return
    setIsPending(true)
    setResult(null)

    const formData = new FormData(event.currentTarget)
    const body = {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      street: [address.street, address.details].filter(Boolean).join(", "),
      area: address.area,
      notes: deliveryNotes,
      website: formData.get("website"),
      deliveryFeeConsent: deliveryFeeAccepted,
      acceptedNearbyDeliveryFee: cart.nearbyDeliveryFee,
      acceptedFartherDeliveryFee: cart.fartherDeliveryFee,
      acceptedDeliveryFee: deliveryQuote?.mode === "automatic" ? deliveryQuote.fee : null,
      deliveryLocation: destination,
      routingMode: deliveryQuote?.mode,
      items: cart.items.map((item) => ({ slug: item.id, variantId: item.variantId || null, quantity: item.qty, note: item.note || "" })),
    }

    try {
      const payload = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(readApi)
      setResult({ success: true, ...payload.data })
      cart.clearCart()
      formRef.current?.reset()
      setDeliveryFeeAccepted(false)
      setDestination(null)
      setDeliveryQuote(null)
      setAddress({ street: "", details: "", area: "", label: "", hasHouseNumber: null, postalCode: "" })
      setContact({ name: "", phone: "", email: "" })
      setDeliveryNotes("")
      setCheckoutStep(1)
    } catch (error) {
      error.unavailableItems?.forEach((cartKey) => cart.removeItem(cartKey))
      if (error.code === "DELIVERY_PRICING_CHANGED" && error.deliveryPricing) {
        cart.setDeliveryPricing(error.deliveryPricing)
        setDeliveryFeeAccepted(false)
      }
      if (error.code === "DELIVERY_QUOTE_CHANGED" && error.deliveryQuote) {
        setDeliveryQuote({ mode: "automatic", ...error.deliveryQuote })
        setDestination({ latitude: error.deliveryQuote.latitude, longitude: error.deliveryQuote.longitude })
        setDeliveryFeeAccepted(false)
      }
      setResult({ success: false, error: error.message || "Could not place the order." })
    } finally {
      setIsPending(false)
    }
  }

  if (cart.items.length === 0 && !result?.success) return <EmptyCart />

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <section className="border border-[#E8DFC8] bg-[#FAF6EE] p-5 shadow-sm sm:p-8 lg:p-10">
          <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">Checkout · Step {checkoutStep} of 2</span>
          <h1 ref={stepHeadingRef} tabIndex={-1} className="scroll-mt-24 font-display text-4xl font-bold leading-tight text-[#2B2B2B] outline-none lg:scroll-mt-28 lg:text-[52px]">{checkoutStep === 1 ? "How can we reach you?" : "Where should we deliver?"}</h1>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#6B6560]">{checkoutStep === 1 ? "We use these details only to confirm your order and delivery." : "Confirm the exact entrance and delivery fee before placing your order."}</p>

          <CheckoutProgress step={checkoutStep} onContactClick={checkoutStep === 2 ? goToContactStep : undefined} />

          <form ref={formRef} onSubmit={handleSubmit} className="mt-7 scroll-mt-28 space-y-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            {!orderingOpen ? <div role="status" className="border-l-2 border-[#8B1E1E] bg-[#8B1E1E]/8 px-4 py-3 text-[13px] font-medium text-[#8B1E1E]">{availabilityMessage}</div> : null}
            <FormErrorNotice
              message={result?.error}
              onDismiss={() => setResult(null)}
              title="Order not placed"
            />
            {checkoutStep === 1 ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input name="name" label="Full name" minLength={2} maxLength={100} autoComplete="name" value={contact.name} onChange={(event) => updateContact("name", event.target.value)} />
                  <Input name="phone" label="Phone number" type="tel" minLength={6} maxLength={30} autoComplete="tel" inputMode="tel" pattern="\+?[0-9 ()\-.]{6,30}" value={contact.phone} onChange={(event) => updateContact("phone", sanitizePhone(event.target.value))} />
                </div>
                <Input name="email" label="Email (optional)" type="email" maxLength={254} autoComplete="email" required={false} value={contact.email} onChange={(event) => updateContact("email", event.target.value)} />
                <div className="border border-[#E8DFC8] bg-white/55 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8B6F47]">Payment</p><p className="mt-1 text-sm font-semibold text-[#2B2B2B]">Cash on delivery</p></div>
                <button type="button" onClick={goToDeliveryStep} className="flex w-full items-center justify-center gap-2 bg-[#8B1E1E] px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#A02424]">Continue to delivery <ArrowRight className="size-4" /></button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input name="street" label="Street" minLength={2} maxLength={120} autoComplete="address-line1" placeholder="e.g. Vounou" value={address.street} onChange={(event) => updateAddress("street", event.target.value)} />
                <Input name="addressDetails" label={`House / building / apartment${address.hasHouseNumber ? " (optional)" : ""}`} minLength={1} maxLength={75} autoComplete="address-line2" placeholder="e.g. No. 12, Building A, Apartment 3" required={!address.hasHouseNumber} value={address.details} onChange={(event) => updateAddress("details", event.target.value)} />
                <Input name="area" label="Area / village" minLength={2} maxLength={100} autoComplete="address-level2" placeholder="e.g. Kissonerga" value={address.area} onChange={(event) => updateAddress("area", event.target.value)} />
                {address.label ? (
                  <div className="border-l-2 border-[#D4A017] bg-[#FFF9E9] px-4 py-3" role="status" aria-live="polite">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6F47]">Address found from the pin</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[#2B2B2B]">{address.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#6B6560]">{address.hasHouseNumber ? "Please verify this is the correct entrance before ordering." : "The map found the street, but not a house number. Complete the house, building, or apartment field above."}</p>
                  </div>
                ) : null}
                <DeliveryLocationPicker
                  addressQuery={[address.details, address.street, address.area].filter(Boolean).join(", ")}
                  destination={destination}
                  quote={deliveryQuote}
                  onDestinationChange={setDestination}
                  onQuoteChange={updateQuote}
                  onAddressSelected={applyResolvedAddress}
                />
                <p className="border-l-2 border-[#D4A017] bg-[#F2EAD8] px-4 py-3 text-[13px] leading-relaxed text-[#5F5547]">Nearby routes cost {formatMoney(cart.nearbyDeliveryFee)} and farther routes cost {formatMoney(cart.fartherDeliveryFee)}. The server verifies the driving distance again when the order is placed.</p>
                <label className="block"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">Delivery notes</span><textarea name="notes" rows={4} maxLength={1000} value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} placeholder="Door code, floor, landmark, or preferred call instructions" className="w-full resize-y border border-[#E8DFC8] bg-white/70 px-4 py-3 text-base leading-relaxed text-[#2B2B2B] outline-none placeholder:text-[#9C9489] focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20 sm:text-[14px]" /></label>
                <label className="flex cursor-pointer items-start gap-3 border border-[#D4A017]/45 bg-[#FFF9E9] p-4 text-[#2B2B2B] transition-colors hover:border-[#D4A017]">
                  <input type="checkbox" name="deliveryFeeConsent" required checked={deliveryFeeAccepted} onChange={(event) => setDeliveryFeeAccepted(event.target.checked)} disabled={!pricingReady || !locationReady} className="mt-0.5 size-5 shrink-0 accent-[#8B1E1E] disabled:cursor-not-allowed" aria-describedby="delivery-fee-consent-copy" />
                  <span id="delivery-fee-consent-copy" className="text-[13px] leading-relaxed"><span className="block font-semibold">I agree to this delivery location and fee.</span><span className="mt-1 block text-[#6B6560]">{!locationReady ? "Confirm a valid delivery point on the map first." : pricingReady ? deliveryFeeConsentText : cart.deliveryPricingStatus === "error" ? "Delivery pricing could not be loaded. Refresh the page before ordering." : "Loading current delivery pricing..."}</span></span>
                </label>
                <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-3">
                  <button type="button" onClick={goToContactStep} disabled={isPending} className="flex min-w-0 items-center justify-center gap-2 border border-[#D7CEC0] bg-white px-3 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#2B2B2B] hover:border-[#8B1E1E] disabled:opacity-60"><ArrowLeft className="size-4 shrink-0" /> Back</button>
                  <button type="submit" disabled={!canPlaceOrder} className="flex min-w-0 items-center justify-center gap-2 bg-[#8B1E1E] px-3 py-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#A02424] disabled:cursor-not-allowed disabled:opacity-60">{isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}{isPending ? "Placing..." : !orderingOpen ? "Ordering closed" : "Place Order"}</button>
                </div>
              </div>
            )}
          </form>
        </section>
        <OrderSummary cart={cart} locked={isPending} quote={deliveryQuote} />
      </div>
      {result?.success ? <OrderSuccessModal order={result} onClose={() => router.push("/delivery")} /> : null}
    </>
  )
}

function CheckoutProgress({ onContactClick, step }) {
  const steps = [
    { number: 1, label: "Contact" },
    { number: 2, label: "Delivery" },
  ]

  return (
    <ol className="mt-7 grid grid-cols-2 border-y border-[#E8DFC8]" aria-label="Checkout progress">
      {steps.map((item) => {
        const complete = step > item.number
        const active = step === item.number
        const content = (
          <>
            <span className={`flex size-7 shrink-0 items-center justify-center border text-xs font-bold ${active || complete ? "border-[#8B1E1E] bg-[#8B1E1E] text-white" : "border-[#D7CEC0] text-[#8B6F47]"}`}>
              {complete ? <Check className="size-4" /> : item.number}
            </span>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${active ? "text-[#8B1E1E]" : "text-[#6B6560]"}`}>{item.label}</span>
          </>
        )

        return (
          <li key={item.number} className={`flex min-w-0 items-center ${item.number === 1 ? "border-r border-[#E8DFC8]" : ""}`} aria-current={active ? "step" : undefined}>
            {item.number === 1 && onContactClick ? (
              <button type="button" onClick={onContactClick} className="flex min-h-14 w-full items-center justify-center gap-2 px-3 text-left hover:bg-[#F2EAD8]">{content}</button>
            ) : (
              <div className="flex min-h-14 w-full items-center justify-center gap-2 px-3">{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function EmptyCart() {
  return <div className="border border-[#E8DFC8] bg-[#FAF6EE] p-8 text-center"><div className="mx-auto mb-5 flex size-14 items-center justify-center bg-[#8B1E1E] text-white"><ShoppingBag className="size-6" /></div><h1 className="font-display text-4xl font-bold text-[#2B2B2B]">Your cart is empty.</h1><p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-[#6B6560]">Add Vietnamese dishes from the delivery menu before checkout.</p><Link href="/delivery" className="mt-7 inline-flex bg-[#8B1E1E] px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#A02424]">Back to Delivery</Link></div>
}

function OrderSummary({ cart, locked, quote }) {
  return (
    <aside className="border border-[#D4A017]/25 bg-[#1E1A18] p-5 text-white shadow-2xl shadow-black/10 lg:sticky lg:top-24">
      <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D4A017]">Your Order</p>
          <h2 className="mt-1 font-display text-3xl font-bold">Summary</h2>
        </div>
        <div className="flex size-12 items-center justify-center bg-[#8B1E1E]"><ShoppingBag className="size-5" /></div>
      </div>

      <div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">
        {cart.items.map((item) => {
          const cartKey = item.cartKey || getCartItemKey(item)
          return (
          <div key={cartKey} className="border border-white/10 bg-white/[0.03] p-3">
            <div className="grid grid-cols-[64px_1fr_auto] gap-3">
              <div className="relative size-16 overflow-hidden bg-white/10">
                {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" /> : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-bold leading-tight">{item.name}</p>
                {item.variantLabel ? <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D4A017]">{item.variantLabel}</p> : null}
                <p className="mt-0.5 text-[12px] text-white/45">{formatMoney(item.price)}</p>
                <div className="mt-3 flex items-center gap-2">
                  <QtyButton disabled={locked} onClick={() => cart.updateQty(cartKey, -1)} label={`Decrease ${item.name}`}><Minus className="size-3.5" /></QtyButton>
                  <span className="min-w-8 text-center text-[13px] font-semibold">{item.qty}</span>
                  <QtyButton disabled={locked || item.qty >= DELIVERY_CONFIG.maxItemQuantity} onClick={() => cart.updateQty(cartKey, 1)} label={`Increase ${item.name}`}><Plus className="size-3.5" /></QtyButton>
                </div>
              </div>
              <button type="button" disabled={locked} onClick={() => cart.removeItem(cartKey)} className="text-white/35 transition-colors hover:text-[#D4A017] disabled:opacity-30" aria-label={`Remove ${item.name}`}>
                <Trash2 className="size-4" />
              </button>
            </div>
            <input value={item.note || ""} onChange={(event) => cart.updateNote(cartKey, event.target.value)} disabled={locked} maxLength={300} placeholder="Kitchen note for this dish" className="mt-3 h-10 w-full border border-white/15 bg-transparent px-2 text-base text-white outline-none placeholder:text-white/30 focus:border-[#D4A017] sm:h-9 sm:text-xs" />
          </div>
          )
        })}
      </div>

      <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-[13px]">
        <PriceRow label="Subtotal" value={formatMoney(cart.subtotal)} />
        <PriceRow label="Delivery fee" value={quote?.mode === "automatic" ? formatMoney(quote.fee) : "To be confirmed"} />
        {quote?.mode === "automatic" ? <PriceRow label="Total" value={formatMoney(cart.subtotal + quote.fee)} strong /> : null}
        <p className="pt-2 text-[11px] leading-relaxed text-white/40">
          {quote?.mode === "automatic" ? `Calculated from the confirmed ${quote.distanceKm.toFixed(1)} km driving route.` : `Nearby routes cost ${formatMoney(cart.nearbyDeliveryFee)} and farther routes cost ${formatMoney(cart.fartherDeliveryFee)}. The restaurant will confirm the final amount.`}
        </p>
      </div>
    </aside>
  )
}

function OrderSuccessModal({ onClose, order }) {
  const closeRef = useRef(null)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event) => { if (event.key === "Escape") onClose() }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKeyDown)
    closeRef.current?.focus()
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown) }
  }, [onClose])
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#1E1A18]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="order-success-title"><div className="flex max-h-[calc(100svh-0.75rem)] w-full max-w-md flex-col overflow-hidden rounded-t-lg border border-[#D4A017]/35 bg-[#FAF6EE] shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:rounded-lg"><div className="flex shrink-0 justify-end p-3 pb-0"><button ref={closeRef} type="button" onClick={onClose} className="flex size-10 items-center justify-center text-[#6B6560] hover:bg-[#F2EAD8]" aria-label="Close order confirmation"><X className="size-5" /></button></div><div className="overflow-y-auto px-5 pb-5 text-center sm:px-8 sm:pb-6"><div className="mx-auto flex size-14 items-center justify-center bg-[#4A7C59]/12 text-[#2F5F3D]"><CheckCircle2 className="size-7" /></div><p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">Order received</p><h2 id="order-success-title" className="mt-2 font-display text-3xl font-bold text-[#2B2B2B]">Thank you for your order.</h2><p className="mt-3 text-sm leading-relaxed text-[#6B6560]">{order.deliveryFeeConfirmed ? `Your delivery fee is ${formatMoney(order.deliveryFee)} and the order total is ${formatMoney(order.total)}.` : "We saved your delivery pin. The restaurant will call to confirm the fee and final amount."}</p><div className="mt-5 border border-[#E8DFC8] bg-white/65 p-3"><div className="flex items-center justify-between gap-3 text-left"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase text-[#8B6F47]">Order reference</p><p className="mt-1 break-all font-mono text-base font-bold text-[#8B1E1E]">{order.reference}</p></div><CopyReferenceButton value={order.reference} /></div><p className="mt-3 border-t border-[#E8DFC8] pt-3 text-xs leading-relaxed text-[#6B6560]">Keep this reference in case you need to contact the restaurant about your order.</p></div></div><div className="shrink-0 border-t border-[#E8DFC8] bg-[#FAF6EE] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:pb-6"><button type="button" onClick={onClose} className="w-full bg-[#8B1E1E] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#A02424]">Done</button></div></div></div>
}

function Input({ autoComplete, inputMode, label, maxLength, minLength, name, onChange, pattern, placeholder, required = true, sanitize, type = "text", value }) {
  return <label className="block"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">{label}</span><input name={name} type={type} required={required} minLength={minLength} maxLength={maxLength} pattern={pattern} inputMode={inputMode} autoComplete={autoComplete} placeholder={placeholder} value={value ?? ""} onChange={onChange} onInput={sanitize ? (event) => { event.currentTarget.value = sanitize(event.currentTarget.value) } : undefined} className="h-12 w-full border border-[#E8DFC8] bg-white/70 px-4 text-base text-[#2B2B2B] outline-none placeholder:text-[#9C9489] focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20 sm:text-[14px]" /></label>
}
function QtyButton({ children, disabled, label, onClick }) { return <button type="button" disabled={disabled} onClick={onClick} className="flex size-8 items-center justify-center border border-white/15 text-white/70 hover:border-[#D4A017]/60 hover:text-[#D4A017] disabled:cursor-not-allowed disabled:opacity-30" aria-label={label}>{children}</button> }
function PriceRow({ label, strong = false, value }) { return <div className={`flex justify-between ${strong ? "border-t border-white/10 pt-2 font-bold text-white" : "text-white/45"}`}><span>{label}</span><span className="tabular-nums">{value}</span></div> }
function sanitizePhone(value) { return value.replace(/[^\d+\s().-]/g, "").replace(/(?!^)\+/g, "") }
