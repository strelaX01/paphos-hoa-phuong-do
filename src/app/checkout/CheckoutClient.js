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
  const idempotencyKeyRef = useRef("")
  const stepTopRef = useRef(null)
  const stepHeadingRef = useRef(null)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [stepDirection, setStepDirection] = useState("forward")
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
  const locationReady = Boolean(destination && deliveryQuote && deliveryQuote.requiresPinAdjustment !== true)
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
    setAddress((current) => {
      const street = String(nextAddress?.street || current.street || "")
      const area = String(nextAddress?.area || current.area || "")
      const postalCode = String(nextAddress?.postalCode || current.postalCode || "")
      const providerLabel = String(nextAddress?.label || "")
      const label = nextAddress?.area || !area
        ? providerLabel
        : [street, area, postalCode, "Cyprus"].filter(Boolean).join(", ")

      return {
        street,
        details: String(nextAddress?.details ?? current.details ?? ""),
        area,
        label,
        hasHouseNumber: nextAddress?.hasHouseNumber === true,
        postalCode,
      }
    })
  }

  function focusStepHeading() {
    window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true })
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      stepTopRef.current?.scrollIntoView({ behavior, block: "start" })
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
    setStepDirection("forward")
    setCheckoutStep(2)
    focusStepHeading()
  }

  function goToContactStep() {
    setStepDirection("backward")
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
      if (!idempotencyKeyRef.current) idempotencyKeyRef.current = crypto.randomUUID()
      const payload = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKeyRef.current },
        body: JSON.stringify(body),
      }).then(readApi)
      setResult({ success: true, ...payload.data })
      cart.clearCart()
      formRef.current?.reset()
      setDeliveryFeeAccepted(false)
      setDestination(null)
      setDeliveryQuote(null)
      idempotencyKeyRef.current = ""
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
        <section ref={stepTopRef} className="scroll-mt-20 border border-[#E8DFC8] bg-[#FAF6EE] p-5 shadow-sm sm:p-8 lg:scroll-mt-24 lg:p-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8B6F47]">Secure checkout</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B1E1E]">Step {checkoutStep} of 2</span>
          </div>
          <div key={`checkout-heading-${checkoutStep}`} className={`checkout-step-enter checkout-step-enter--${stepDirection}`}>
            <h1 ref={stepHeadingRef} tabIndex={-1} className="scroll-mt-24 font-display text-4xl font-bold leading-tight text-[#2B2B2B] outline-none lg:scroll-mt-28 lg:text-[52px]">{checkoutStep === 1 ? "How can we reach you?" : "Where should we deliver?"}</h1>
            <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#6B6560]">{checkoutStep === 1 ? "We use these details only to confirm your order and delivery." : "Confirm the exact entrance and delivery fee before placing your order."}</p>
          </div>

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
              <div key="contact-step" className={`checkout-step-enter checkout-step-enter--${stepDirection} space-y-4`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input name="name" label="Full name" minLength={2} maxLength={100} autoComplete="name" placeholder="e.g. Maria Georgiou" value={contact.name} onChange={(event) => updateContact("name", event.target.value)} />
                  <Input name="phone" label="Phone number" type="tel" minLength={6} maxLength={30} autoComplete="tel" inputMode="tel" pattern="\+?[0-9 ()\-.]{6,30}" placeholder="e.g. +357 99 123456" value={contact.phone} onChange={(event) => updateContact("phone", sanitizePhone(event.target.value))} />
                </div>
                <Input name="email" label="Email (optional)" type="email" maxLength={254} autoComplete="email" placeholder="e.g. name@example.com" required={false} value={contact.email} onChange={(event) => updateContact("email", event.target.value)} />
                <button type="button" onClick={goToDeliveryStep} className="flex w-full items-center justify-center gap-2 bg-[#8B1E1E] px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#A02424]">Continue to delivery <ArrowRight className="size-4" /></button>
              </div>
            ) : (
              <div key="delivery-step" className={`checkout-step-enter checkout-step-enter--${stepDirection} space-y-4`}>
                <Input name="street" label="Street" minLength={2} maxLength={120} autoComplete="address-line1" placeholder="e.g. Vounou" value={address.street} onChange={(event) => updateAddress("street", event.target.value)} />
                <Input name="addressDetails" label={`House / building / apartment${address.hasHouseNumber ? " (optional)" : ""}`} minLength={1} maxLength={75} autoComplete="address-line2" placeholder="e.g. No. 12, Building A, Apartment 3" required={!address.hasHouseNumber} value={address.details} onChange={(event) => updateAddress("details", event.target.value)} />
                <Input name="area" label="Area / village" minLength={2} maxLength={100} autoComplete="address-level2" placeholder="e.g. Kissonerga" value={address.area} onChange={(event) => updateAddress("area", event.target.value)} />
                {address.label ? (
                  <div className="border-l-2 border-[#D4A017] bg-[#FFF9E9] px-4 py-3" role="status" aria-live="polite">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6F47]">Address found from the pin</p>
                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[#2B2B2B]">{address.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#6B6560]">{!address.area ? "The map found the street, but could not verify the area or village. Enter it manually above, then confirm the pin is at the correct entrance." : address.hasHouseNumber ? "Please verify this is the correct entrance before ordering." : "The map found the street, but not a house number. Complete the house, building, or apartment field above."}</p>
                  </div>
                ) : null}
                <DeliveryLocationPicker
                  destination={destination}
                  quote={deliveryQuote}
                  subtotal={cart.subtotal}
                  onDestinationChange={setDestination}
                  onQuoteChange={updateQuote}
                  onAddressSelected={applyResolvedAddress}
                />
                <p className="border-l-2 border-[#D4A017] bg-[#F2EAD8] px-4 py-3 text-[13px] leading-relaxed text-[#5F5547]">{deliveryPricingSummary(cart)} The server verifies the cart and driving distance again when the order is placed.</p>
                <label className="block"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">Delivery notes</span><textarea name="notes" rows={4} maxLength={1000} value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} placeholder="Door code, floor, landmark, or preferred call instructions" className="w-full resize-y border border-[#E8DFC8] bg-white/70 px-4 py-3 text-base leading-relaxed text-[#2B2B2B] outline-none placeholder:text-[#9C9489] focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20 sm:text-[14px]" /></label>
                <label className="flex cursor-pointer items-start gap-3 border border-[#D4A017]/45 bg-[#FFF9E9] p-4 text-[#2B2B2B] transition-colors hover:border-[#D4A017]">
                  <input type="checkbox" name="deliveryFeeConsent" required checked={deliveryFeeAccepted} onChange={(event) => setDeliveryFeeAccepted(event.target.checked)} disabled={!pricingReady || !locationReady} className="mt-0.5 size-5 shrink-0 accent-[#8B1E1E] disabled:cursor-not-allowed" aria-describedby="delivery-fee-consent-copy" />
                  <span id="delivery-fee-consent-copy" className="text-[13px] leading-relaxed"><span className="block font-semibold">I agree to this delivery location and fee.</span><span className="mt-1 block text-[#6B6560]">{deliveryQuote?.requiresPinAdjustment ? "Your device location is not precise enough. Tap or drag the pin to the exact entrance first." : !locationReady ? "Confirm a valid delivery point on the map first." : pricingReady ? deliveryFeeConsentText : cart.deliveryPricingStatus === "error" ? "Delivery pricing could not be loaded. Refresh the page before ordering." : "Loading current delivery pricing..."}</span></span>
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
    { number: 1, label: "Contact", detail: "Your details" },
    { number: 2, label: "Delivery", detail: "Address & fee" },
  ]

  return (
    <ol className="relative mt-7 grid grid-cols-2 gap-5 border-y border-[#E8DFC8] py-4 sm:gap-8" aria-label="Checkout progress">
      <span className="pointer-events-none absolute left-[25%] right-[25%] top-[31px] h-px bg-[#D7CEC0]" aria-hidden="true">
        <span className={`block h-full origin-left bg-[#8B1E1E] transition-transform duration-300 ${step === 2 ? "scale-x-100" : "scale-x-0"}`} />
      </span>
      {steps.map((item) => {
        const complete = step > item.number
        const active = step === item.number
        const content = (
          <>
            <span className={`relative z-10 flex size-8 shrink-0 items-center justify-center border text-xs font-bold transition-colors duration-300 ${active || complete ? "border-[#8B1E1E] bg-[#8B1E1E] text-white" : "border-[#D7CEC0] bg-[#FAF6EE] text-[#8B6F47]"}`}>
              {complete ? <Check className="size-4" /> : item.number}
            </span>
            <span className="min-w-0 text-center">
              <span className={`block text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${active ? "text-[#8B1E1E]" : "text-[#5F5547]"}`}>{item.label}</span>
              <span className="mt-0.5 block truncate text-[11px] text-[#8B8177]">{item.detail}</span>
            </span>
          </>
        )

        return (
          <li key={item.number} className="flex min-w-0 items-center justify-center" aria-current={active ? "step" : undefined}>
            {item.number === 1 && onContactClick ? (
              <button type="button" onClick={onContactClick} className="flex min-h-16 w-full flex-col items-center justify-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]">{content}</button>
            ) : (
              <div className="flex min-h-16 w-full flex-col items-center justify-center gap-2 text-center">{content}</div>
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
    <aside className="border border-[#dfd4c4] bg-[#fbf8f2] text-[#2b241e] shadow-[0_18px_45px_rgba(52,39,27,0.1)] lg:sticky lg:top-24">
      <div className="flex min-h-[88px] items-center justify-between border-b border-[#e4dac9] px-5 py-4 sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9d2023]">Your order</p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <h2 className="font-display text-[28px] font-semibold leading-none">Summary</h2>
            <span className="text-[11px] text-[#81766b]">{cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}</span>
          </div>
        </div>
        <div className="flex size-11 items-center justify-center bg-[#9d2023] text-white"><ShoppingBag className="size-5" /></div>
      </div>

      <div className="max-h-[480px] divide-y divide-[#e4dac9] overflow-y-auto px-5 sm:px-6">
        {cart.items.map((item) => {
          const cartKey = item.cartKey || getCartItemKey(item)
          return (
          <article key={cartKey} className="py-5">
            <div className="grid grid-cols-[64px_minmax(0,1fr)_36px] gap-3">
              <div className="relative size-16 overflow-hidden border border-[#e4dac9] bg-[#f1eadf]">
                {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" /> : <span className="grid h-full place-items-center text-[#a89c8c]"><ShoppingBag className="size-5" /></span>}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#2b241e]">{item.name}</p>
                {item.variantLabel ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9d2023]">{item.variantLabel}</p> : null}
                <p className="mt-1 text-[12px] font-semibold tabular-nums text-[#9d2023]">{formatMoney(item.price)}</p>
              </div>
              <button type="button" disabled={locked} onClick={() => cart.removeItem(cartKey)} className="flex size-9 items-center justify-center border border-[#e4dac9] text-[#9d2023] transition-colors hover:border-[#9d2023] hover:bg-[#9d2023] hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Remove ${item.name}`}>
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="grid h-9 w-[112px] shrink-0 grid-cols-[36px_1fr_36px] border border-[#d9cdbb] bg-white">
                <QtyButton disabled={locked || Number(item.qty) <= 1} onClick={() => cart.updateQty(cartKey, -1)} label={`Decrease ${item.name}`}><Minus className="size-3.5" /></QtyButton>
                <span className="grid place-items-center border-x border-[#e4dac9] text-[13px] font-semibold tabular-nums">{item.qty}</span>
                <QtyButton disabled={locked || Number(item.qty) >= DELIVERY_CONFIG.maxItemQuantity} onClick={() => cart.updateQty(cartKey, 1)} label={`Increase ${item.name}`}><Plus className="size-3.5" /></QtyButton>
              </div>
              <span className="min-w-[72px] text-right text-[12px] font-medium leading-none tabular-nums text-[#81766b]">{formatMoney(Number(item.price) * Number(item.qty))}</span>
            </div>

            <input value={item.note || ""} onChange={(event) => cart.updateNote(cartKey, event.target.value)} disabled={locked} maxLength={300} placeholder="Add a kitchen note (optional)" className="mt-3 h-11 w-full border border-[#d9cdbb] bg-white px-3 text-base text-[#2b241e] outline-none placeholder:text-[#9a9085] focus:border-[#9d2023] disabled:cursor-not-allowed disabled:bg-[#f1eadf] sm:h-10 sm:text-sm" />
          </article>
          )
        })}
      </div>

      <div className="space-y-2 border-t border-[#e4dac9] bg-white px-5 py-5 text-[13px] sm:px-6">
        <PriceRow label="Subtotal" value={formatMoney(cart.subtotal)} />
        <PriceRow label="Delivery fee" value={quote?.mode === "automatic" ? formatMoney(quote.fee) : "To be confirmed"} />
        {quote?.mode === "automatic" ? <PriceRow label="Total" value={formatMoney(cart.subtotal + quote.fee)} strong /> : null}
        <p className="mt-3 border-l-2 border-[#d4a017] pl-3 pt-0 text-[11px] leading-relaxed text-[#81766b]">
          {quote?.mode === "automatic" ? `Calculated from the confirmed ${quote.distanceKm.toFixed(1)} km driving route.` : `${deliveryPricingSummary(cart)} The restaurant will confirm the final amount.`}
        </p>
      </div>
    </aside>
  )
}

function deliveryPricingSummary(cart) {
  const paidTiers = `Nearby routes cost ${formatMoney(cart.nearbyDeliveryFee)} and farther routes cost ${formatMoney(cart.fartherDeliveryFee)}.`
  if (!cart.freeDeliveryEnabled) return paidTiers
  return `Free delivery within ${Number(cart.freeDeliveryMaxKm).toFixed(1)} km on orders of ${formatMoney(cart.freeDeliveryMinimum)} or more. ${paidTiers}`
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
function QtyButton({ children, disabled, label, onClick }) { return <button type="button" disabled={disabled} onClick={onClick} className="flex items-center justify-center text-[#5f574f] transition-colors hover:bg-[#f4ede2] hover:text-[#9d2023] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4a017] disabled:cursor-not-allowed disabled:bg-[#f4ede2]/55 disabled:text-[#b8afa4]" aria-label={label}>{children}</button> }
function PriceRow({ label, strong = false, value }) { return <div className={`flex items-baseline justify-between gap-4 ${strong ? "mt-3 border-t border-[#e4dac9] pt-3 font-bold text-[#2b241e]" : "text-[#81766b]"}`}><span>{label}</span><span className={`text-right tabular-nums ${strong ? "text-base" : "font-medium text-[#5f574f]"}`}>{value}</span></div> }
function sanitizePhone(value) { return value.replace(/[^\d+\s().-]/g, "").replace(/(?!^)\+/g, "") }
