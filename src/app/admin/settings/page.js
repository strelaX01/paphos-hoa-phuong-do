"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { BellRing, CalendarDays, Euro, Eye, LoaderCircle, LocateFixed, Megaphone, Plus, Save, Sparkles, Trash2, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import AdminToast from "@/app/admin/_components/AdminToast"
import { FestivalEffectPreview } from "@/app/components/shared/FestivalEffect"
import { SettingsPageSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { dedupeClientRequest } from "@/lib/dedupeClientRequest"
import { getStorefrontNoticeDestination, getStorefrontNoticeDestinationByHref, STOREFRONT_NOTICE_DESTINATIONS } from "@/lib/storefrontNoticeDestinations"

const effectOptions = [
  { id: "none", label: "None", description: "No seasonal overlay" },
  { id: "tet", label: "Tet", description: "Five-petal peach blossoms with golden centres" },
  { id: "christmas", label: "Christmas", description: "Six-branch snowflakes falling softly" },
  { id: "new-year", label: "New Year", description: "Light confetti for celebration days" },
  { id: "valentine", label: "Valentine", description: "Soft petals for dinner promotions" },
  { id: "summer", label: "Summer", description: "Fresh leaf accents for the summer season" },
]

const noticeTypeOptions = [
  {
    id: "temporary-closure",
    label: "Temporary closure",
    description: "Use when the restaurant is closed for a day, private event, or staff break.",
    title: "We are temporarily closed",
    message: "Hoa Phuong Do will be closed today and will reopen tomorrow with normal hours. Thank you for understanding.",
    ctaDestination: "contact",
  },
  {
    id: "holiday-hours",
    label: "Holiday hours",
    description: "Use for Christmas, Tet, Easter, or special holiday opening times.",
    title: "Holiday opening hours",
    message: "Our opening hours are slightly different during the holiday period. Please check before visiting or booking.",
    ctaDestination: "book-table",
  },
  {
    id: "promotion",
    label: "Promotion",
    description: "Use for special offers, new dishes, discounts, or weekend campaigns.",
    title: "Weekend special",
    message: "Book a table this weekend and enjoy a complimentary Vietnamese iced tea with your meal.",
    ctaDestination: "book-table",
  },
  {
    id: "general",
    label: "General notice",
    description: "Use for regular restaurant announcements.",
    title: "Restaurant notice",
    message: "A short update for our guests.",
    ctaDestination: null,
  },
]

const noticePriorityStyles = {
  Normal: {
    badge: "bg-[#D4A017] text-[#2B2B2B]",
    border: "border-[#D4A017]/45",
    icon: "bg-[#F6F1E8] text-[#8B1E1E]",
  },
  Important: {
    badge: "bg-[#8B1E1E] text-white",
    border: "border-[#8B1E1E]/35",
    icon: "bg-[#8B1E1E] text-white",
  },
  Urgent: {
    badge: "bg-red-700 text-white",
    border: "border-red-300",
    icon: "bg-red-700 text-white",
  },
}

const effectFromApi = { NONE: "none", LUNAR_NEW_YEAR: "tet", CHRISTMAS: "christmas", NEW_YEAR: "new-year", VALENTINE: "valentine", SUMMER: "summer" }
const effectToApi = { none: "NONE", tet: "LUNAR_NEW_YEAR", christmas: "CHRISTMAS", "new-year": "NEW_YEAR", valentine: "VALENTINE", summer: "SUMMER" }
const noticeTypeFromApi = { GENERAL: "general", PROMOTION: "promotion", TEMPORARY_CLOSURE: "temporary-closure", HOLIDAY: "holiday-hours" }
const noticeTypeToApi = { general: "GENERAL", promotion: "PROMOTION", "temporary-closure": "TEMPORARY_CLOSURE", "holiday-hours": "HOLIDAY" }
const euroFormatter = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 })
const LocationMap = dynamic(() => import("@/app/components/shared/LocationMap"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse bg-[#F0E9DC] sm:h-[390px]" /> })

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors)[0] : null
    throw new Error(firstError || payload.error || "Request failed.")
  }
  return payload
}

function titleCase(value) {
  const text = String(value || "")
  return text.charAt(0) + text.slice(1).toLowerCase()
}

const initialSettings = {
  restaurantEmail: "hoangbao130919@gmail.com",
  phoneNumbers: [
    { clientId: "phone-primary", value: "+357 26652228" },
    { clientId: "phone-secondary", value: "+357 99856636" },
  ],
  restaurantAddress: "Leoforos Chrysoneras, Z9 Efstathios Plaza, 8574 Kissonerga",
  restaurantMapUrl: "https://maps.google.com",
  nearbyDeliveryFee: "3.00",
  fartherDeliveryFee: "3.50",
  restaurantLatitude: "",
  restaurantLongitude: "",
  nearbyDeliveryMaxKm: "5.00",
  maximumDeliveryKm: "15.00",
  openingHours: [
    { clientId: "monday", day: "Monday", openTime: "11:00", closeTime: "22:00", isClosed: false },
    { clientId: "tuesday", day: "Tuesday", openTime: "11:00", closeTime: "22:00", isClosed: false },
    { clientId: "wednesday", day: "Wednesday", openTime: "11:00", closeTime: "22:00", isClosed: false },
    { clientId: "thursday", day: "Thursday", openTime: "11:00", closeTime: "22:00", isClosed: false },
    { clientId: "friday", day: "Friday", openTime: "11:00", closeTime: "22:00", isClosed: false },
    { clientId: "saturday", day: "Saturday", openTime: "11:00", closeTime: "23:00", isClosed: false },
    { clientId: "sunday", day: "Sunday", openTime: "12:00", closeTime: "21:00", isClosed: false },
  ],
  festivalEffectEnabled: true,
  festivalEffect: "tet",
  effectIntensity: "Medium",
  festivalEffectStartDate: "",
  festivalEffectEndDate: "",
  announcementEnabled: true,
  announcementType: "temporary-closure",
  announcementPriority: "Important",
  announcementTitle: "We are temporarily closed",
  announcementMessage: "Hoa Phuong Do will be closed today and will reopen tomorrow with normal hours. Thank you for understanding.",
  announcementCtaEnabled: true,
  announcementCtaDestination: "contact",
  announcementStartDate: "",
  announcementEndDate: "",
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(initialSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locatingRestaurant, setLocatingRestaurant] = useState(false)
  const [toast, setToast] = useState(null)
  const toastIdRef = useRef(0)

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }

  useEffect(() => {
    let active = true
    dedupeClientRequest("/api/admin/settings", () => {
      return fetch("/api/admin/settings", { cache: "no-store" }).then(readApi)
    })
      .then(({ data }) => {
        if (!active) return
        setSettings((current) => ({
          ...current,
          restaurantEmail: data.profile.email,
          phoneNumbers: data.profile.phones.map((value, index) => ({ clientId: `phone-${index}`, value })),
          restaurantAddress: data.profile.address,
          restaurantMapUrl: data.profile.mapUrl,
          openingHours: data.openingHours.map((entry, index) => ({ ...entry, clientId: entry.id || `opening-${index}` })),
          festivalEffectEnabled: data.storefront.festivalEffectEnabled,
          festivalEffect: effectFromApi[data.storefront.festivalEffect] || "none",
          effectIntensity: data.storefront.effectIntensity,
          festivalEffectStartDate: data.storefront.startsAt,
          festivalEffectEndDate: data.storefront.endsAt,
          nearbyDeliveryFee: data.storefront.nearbyDeliveryFee,
          fartherDeliveryFee: data.storefront.fartherDeliveryFee,
          restaurantLatitude: data.storefront.restaurantLatitude,
          restaurantLongitude: data.storefront.restaurantLongitude,
          nearbyDeliveryMaxKm: data.storefront.nearbyDeliveryMaxKm,
          maximumDeliveryKm: data.storefront.maximumDeliveryKm,
          announcementEnabled: data.notice.enabled,
          announcementType: noticeTypeFromApi[data.notice.type] || "general",
          announcementPriority: titleCase(data.notice.priority),
          announcementTitle: data.notice.title,
          announcementMessage: data.notice.message,
          announcementCtaEnabled: data.notice.ctaEnabled,
          announcementCtaDestination: getStorefrontNoticeDestinationByHref(data.notice.ctaHref)?.id || "contact",
          announcementStartDate: data.notice.startsAt,
          announcementEndDate: data.notice.endsAt,
        }))
      })
      .catch((error) => { if (active) showToast(error.message || "Could not load settings.", "error") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const activeEffect = useMemo(
    () => effectOptions.find((effect) => effect.id === settings.festivalEffect) || effectOptions[0],
    [settings.festivalEffect]
  )
  const activeNoticeType = useMemo(
    () => noticeTypeOptions.find((notice) => notice.id === settings.announcementType) || noticeTypeOptions[0],
    [settings.announcementType]
  )
  const activePriorityStyle = noticePriorityStyles[settings.announcementPriority] || noticePriorityStyles.Normal
  const activeCtaDestination = getStorefrontNoticeDestination(settings.announcementCtaDestination) || STOREFRONT_NOTICE_DESTINATIONS[0]

  const updateSetting = (field, value) => {
    setSettings((previous) => ({ ...previous, [field]: value }))
  }

  const updateOpeningHour = (clientId, field, value) => {
    setSettings((previous) => ({ ...previous, openingHours: previous.openingHours.map((entry) => entry.clientId === clientId ? { ...entry, [field]: value } : entry) }))
  }

  const addPhoneNumber = () => {
    setSettings((previous) => ({ ...previous, phoneNumbers: [...previous.phoneNumbers, { clientId: `phone-${Date.now()}`, value: "" }] }))
  }

  const updatePhoneNumber = (clientId, value) => {
    setSettings((previous) => ({ ...previous, phoneNumbers: previous.phoneNumbers.map((entry) => entry.clientId === clientId ? { ...entry, value } : entry) }))
  }

  const removePhoneNumber = (clientId) => {
    setSettings((previous) => ({ ...previous, phoneNumbers: previous.phoneNumbers.filter((entry) => entry.clientId !== clientId) }))
  }

  const updateRestaurantLocation = ({ latitude, longitude }) => {
    setSettings((previous) => ({ ...previous, restaurantLatitude: Number(latitude).toFixed(7), restaurantLongitude: Number(longitude).toFixed(7) }))
  }

  const locateRestaurantAddress = async () => {
    if (settings.restaurantAddress.trim().length < 3) return showToast("Enter the restaurant address first.", "error")
    setLocatingRestaurant(true)
    try {
      const payload = await fetch("/api/delivery/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: settings.restaurantAddress }) }).then(readApi)
      if (!payload.data?.length) throw new Error("No matching location was found. Check the address and try again.")
      updateRestaurantLocation(payload.data[0])
      showToast("Restaurant location found. Drag the pin if the entrance is different.")
    } catch (error) {
      showToast(error.message || "Could not find the restaurant location.", "error")
    } finally {
      setLocatingRestaurant(false)
    }
  }

  const updateNoticeType = (noticeTypeId) => {
    const noticeType = noticeTypeOptions.find((notice) => notice.id === noticeTypeId) || noticeTypeOptions[0]

    setSettings((previous) => ({
      ...previous,
      announcementType: noticeType.id,
      announcementTitle: noticeType.title,
      announcementMessage: noticeType.message,
      announcementCtaEnabled: Boolean(noticeType.ctaDestination),
      announcementCtaDestination: noticeType.ctaDestination || previous.announcementCtaDestination,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { email: settings.restaurantEmail, phones: settings.phoneNumbers.map((entry) => entry.value), address: settings.restaurantAddress, mapUrl: settings.restaurantMapUrl },
          openingHours: settings.openingHours.map(({ day, openTime, closeTime, isClosed }) => ({ day, openTime, closeTime, isClosed })),
          storefront: { festivalEffectEnabled: settings.festivalEffectEnabled, festivalEffect: effectToApi[settings.festivalEffect], effectIntensity: settings.effectIntensity, startsAt: settings.festivalEffectStartDate, endsAt: settings.festivalEffectEndDate, nearbyDeliveryFee: settings.nearbyDeliveryFee, fartherDeliveryFee: settings.fartherDeliveryFee, restaurantLatitude: settings.restaurantLatitude, restaurantLongitude: settings.restaurantLongitude, nearbyDeliveryMaxKm: settings.nearbyDeliveryMaxKm, maximumDeliveryKm: settings.maximumDeliveryKm },
          notice: { enabled: settings.announcementEnabled, type: noticeTypeToApi[settings.announcementType], priority: settings.announcementPriority.toUpperCase(), title: settings.announcementTitle, message: settings.announcementMessage, ctaEnabled: settings.announcementCtaEnabled, ctaLabel: activeCtaDestination.label, ctaHref: activeCtaDestination.href, startsAt: settings.announcementStartDate, endsAt: settings.announcementEndDate },
        }),
      }).then(readApi)
      setSettings((current) => ({ ...current, ...payload.data.storefront, festivalEffect: current.festivalEffect, openingHours: payload.data.openingHours.map((entry, index) => ({ ...entry, clientId: entry.id || `saved-${index}` })) }))
      showToast("Settings saved and published.")
    } catch (error) {
      showToast(error.message || "Could not save settings.", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell
      active="settings"
      eyebrow="Storefront controls"
      title="Settings"
      description="Manage seasonal website effects and customer notification popup content."
      action={
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving..." : "Save settings"}
        </Button>
      }
    >
      <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />
      {loading ? <SettingsPageSkeleton /> : <div className="space-y-5">
          <Card className="border-[#E4DAC9] bg-white">
            <CardHeader><CardTitle className="font-display text-xl">Restaurant information</CardTitle><CardDescription>Basic contact details shown across the customer website.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField label="Email"><input type="email" value={settings.restaurantEmail} onChange={(event) => updateSetting("restaurantEmail", event.target.value)} className={fieldClassName} maxLength={254} disabled={loading} /></FormField>
              <FormField label="Map URL"><input type="url" value={settings.restaurantMapUrl} onChange={(event) => updateSetting("restaurantMapUrl", event.target.value)} className={fieldClassName} maxLength={1000} disabled={loading} /></FormField>
              <div className="md:col-span-2"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756D62]">Phone numbers</p><Button type="button" variant="outline" size="sm" onClick={addPhoneNumber} disabled={loading}><Plus className="size-4" />Add phone</Button></div><div className="space-y-2">{settings.phoneNumbers.length ? settings.phoneNumbers.map((entry, index) => <div key={entry.clientId} className="flex items-center gap-2"><input type="tel" value={entry.value} onChange={(event) => updatePhoneNumber(entry.clientId, event.target.value.replace(/[^\d+\s().-]/g, "").replace(/(?!^)\+/g, ""))} className={fieldClassName} maxLength={30} disabled={loading} aria-label={`Phone number ${index + 1}`} placeholder="+357 26652228" /><Button type="button" variant="destructive" size="icon-sm" onClick={() => removePhoneNumber(entry.clientId)} disabled={loading} aria-label={`Delete phone number ${index + 1}`}><Trash2 className="size-4" /></Button></div>) : <p className="border border-dashed border-[#E4DAC9] bg-[#FAF7F0] p-4 text-sm text-[#756D62]">No phone numbers added.</p>}</div></div>
              <div className="md:col-span-2"><FormField label="Address"><textarea rows={2} value={settings.restaurantAddress} onChange={(event) => updateSetting("restaurantAddress", event.target.value)} className={`${fieldClassName} resize-y`} maxLength={300} disabled={loading} /></FormField></div>
            </CardContent>
          </Card>

          <Card className="border-[#E4DAC9] bg-white">
            <CardHeader className="flex-row items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F6F1E8] text-[#8B1E1E]"><Euro className="size-5" /></div>
              <div><CardTitle className="font-display text-xl">Delivery pricing</CardTitle><CardDescription>Set the two delivery fees shown to customers and used for new orders.</CardDescription></div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MoneyInput label="Nearby delivery fee" value={settings.nearbyDeliveryFee} onChange={(value) => updateSetting("nearbyDeliveryFee", value)} disabled={loading} />
                <MoneyInput label="Farther delivery fee" value={settings.fartherDeliveryFee} onChange={(value) => updateSetting("fartherDeliveryFee", value)} disabled={loading} />
                <DecimalInput label="Nearby up to (km)" value={settings.nearbyDeliveryMaxKm} onChange={(value) => updateSetting("nearbyDeliveryMaxKm", value)} disabled={loading} />
                <DecimalInput label="Maximum distance (km)" value={settings.maximumDeliveryKm} onChange={(value) => updateSetting("maximumDeliveryKm", value)} disabled={loading} />
              </div>
              <div className="mt-5 overflow-hidden rounded-lg border border-[#E4DAC9]">
                <div className="flex flex-col gap-3 bg-[#FAF7F0] p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-semibold text-[#2B2B2B]">Restaurant route origin</p><p className="mt-1 text-xs leading-relaxed text-[#756D62]">This pin is the starting point for delivery distance. Set it at the restaurant entrance.</p></div>
                  <Button type="button" variant="outline" size="sm" onClick={locateRestaurantAddress} disabled={loading || locatingRestaurant}><LocateFixed className="size-4" />{locatingRestaurant ? "Finding..." : "Find from address"}</Button>
                </div>
                <LocationMap
                  destination={settings.restaurantLatitude && settings.restaurantLongitude ? { latitude: Number(settings.restaurantLatitude), longitude: Number(settings.restaurantLongitude) } : null}
                  destinationTone="restaurant"
                  onChange={updateRestaurantLocation}
                  showLocate
                />
              </div>
              <p className="mt-4 border-l-2 border-[#D4A017] bg-[#FAF7F0] px-4 py-3 text-sm leading-relaxed text-[#756D62]">Changes apply to new route quotes and orders only. Existing orders keep the fee and distance accepted by the customer.</p>
            </CardContent>
          </Card>

          <Card className="border-[#E4DAC9] bg-white">
            <CardHeader><CardTitle className="font-display text-xl">Opening hours</CardTitle><CardDescription>Set regular hours for each weekday or mark it as closed.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {settings.openingHours.map((entry) => <div key={entry.clientId} className={`grid gap-3 border p-3 sm:grid-cols-[minmax(9rem,1fr)_8rem_8rem_auto] sm:items-end ${entry.isClosed ? "border-red-200 bg-red-50/45" : "border-[#E4DAC9] bg-[#FAF7F0]"}`}>
                <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#756D62]">Day</p><p className="flex h-10 items-center font-semibold text-[#2B2B2B]">{entry.day}</p></div>
                <FormField label="Opens"><input type="time" value={entry.openTime} onChange={(event) => updateOpeningHour(entry.clientId, "openTime", event.target.value)} className={fieldClassName} disabled={loading || entry.isClosed} /></FormField>
                <FormField label="Closes"><input type="time" value={entry.closeTime} onChange={(event) => updateOpeningHour(entry.clientId, "closeTime", event.target.value)} className={fieldClassName} disabled={loading || entry.isClosed} /></FormField>
                <label className="flex h-10 items-center gap-2 text-sm font-medium sm:mb-0"><input type="checkbox" checked={entry.isClosed} onChange={(event) => updateOpeningHour(entry.clientId, "isClosed", event.target.checked)} className="size-4 accent-[#8B1E1E]" disabled={loading} />Closed</label>
              </div>)}
            </CardContent>
          </Card>
          <Card className="border-[#E4DAC9] bg-white">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F6F1E8] text-[#8B1E1E]">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <CardTitle className="font-display text-xl">Festival effect</CardTitle>
                  <CardDescription>Choose a light seasonal effect for the public website.</CardDescription>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.festivalEffectEnabled}
                label="Festival effect"
                onChange={(checked) => updateSetting("festivalEffectEnabled", checked)}
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {effectOptions.map((effect) => {
                  const isSelected = settings.festivalEffect === effect.id

                  return (
                    <button
                      key={effect.id}
                      type="button"
                      onClick={() => updateSetting("festivalEffect", effect.id)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-[#8B1E1E] bg-[#8B1E1E]/5"
                          : "border-[#E4DAC9] bg-[#FAF7F0] hover:border-[#D4A017]/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[#2B2B2B]">{effect.label}</span>
                        {isSelected ? <Badge className="bg-[#D4A017] text-[#2B2B2B]">Selected</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-[#756D62]">{effect.description}</p>
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Effect intensity">
                  <select
                    value={settings.effectIntensity}
                    onChange={(event) => updateSetting("effectIntensity", event.target.value)}
                    className={fieldClassName}
                    disabled={!settings.festivalEffectEnabled || settings.festivalEffect === "none"}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </FormField>
                <FormField label="Show from">
                  <input
                    value={settings.festivalEffectStartDate}
                    onChange={(event) => updateSetting("festivalEffectStartDate", event.target.value)}
                    className={fieldClassName}
                    type="date"
                    disabled={!settings.festivalEffectEnabled || settings.festivalEffect === "none"}
                  />
                </FormField>
                <FormField label="Show until">
                  <input
                    value={settings.festivalEffectEndDate}
                    onChange={(event) => updateSetting("festivalEffectEndDate", event.target.value)}
                    className={fieldClassName}
                    type="date"
                    disabled={!settings.festivalEffectEnabled || settings.festivalEffect === "none"}
                  />
                </FormField>
              </div>
              <p className="text-xs leading-relaxed text-[#756D62]">
                Leave both dates empty to keep the selected effect on until you disable it manually. Scheduled dates follow Cyprus time.
              </p>
              <FestivalSettingsPreview activeEffect={activeEffect} settings={settings} />
            </CardContent>
          </Card>

          <Card className="border-[#E4DAC9] bg-white">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F6F1E8] text-[#8B1E1E]">
                  <Megaphone className="size-5" />
                </div>
                <div>
                  <CardTitle className="font-display text-xl">Storefront notice</CardTitle>
                  <CardDescription>Show closure notices, holiday hours, or promotions to customers.</CardDescription>
                </div>
              </div>
              <ToggleSwitch
                checked={settings.announcementEnabled}
                label="Storefront notice popup"
                onChange={(checked) => updateSetting("announcementEnabled", checked)}
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {noticeTypeOptions.map((noticeType) => {
                  const isSelected = settings.announcementType === noticeType.id

                  return (
                    <button
                      key={noticeType.id}
                      type="button"
                      onClick={() => updateNoticeType(noticeType.id)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-[#8B1E1E] bg-[#8B1E1E]/5"
                          : "border-[#E4DAC9] bg-[#FAF7F0] hover:border-[#D4A017]/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-[#2B2B2B]">{noticeType.label}</span>
                        {isSelected ? <Badge className="bg-[#D4A017] text-[#2B2B2B]">Selected</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-[#756D62]">{noticeType.description}</p>
                    </button>
                  )
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Priority">
                  <select
                    value={settings.announcementPriority}
                    onChange={(event) => updateSetting("announcementPriority", event.target.value)}
                    className={fieldClassName}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </FormField>
                <FormField label="Show from">
                  <input
                    value={settings.announcementStartDate}
                    onChange={(event) => updateSetting("announcementStartDate", event.target.value)}
                    className={fieldClassName}
                    type="date"
                  />
                </FormField>
                <FormField label="Show until">
                  <input
                    value={settings.announcementEndDate}
                    onChange={(event) => updateSetting("announcementEndDate", event.target.value)}
                    className={fieldClassName}
                    type="date"
                  />
                </FormField>
              </div>

              <FormField label="Notice title">
                <input
                  value={settings.announcementTitle}
                  onChange={(event) => updateSetting("announcementTitle", event.target.value)}
                  className={fieldClassName}
                  placeholder="We are temporarily closed"
                />
              </FormField>

              <FormField label="Notice message">
                <textarea
                  rows={4}
                  value={settings.announcementMessage}
                  onChange={(event) => updateSetting("announcementMessage", event.target.value)}
                  className={`${fieldClassName} min-h-28 resize-y`}
                  placeholder="Write a clear short message for customers."
                />
              </FormField>

              <div className="rounded-lg border border-[#E4DAC9] bg-[#FAF7F0] p-4">
                <label className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    <span className="block font-semibold text-[#2B2B2B]">Show action button</span>
                    <span className="text-xs text-[#756D62]">Use this for booking links, opening hours, menu, or contact page.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.announcementCtaEnabled}
                    onChange={(event) => updateSetting("announcementCtaEnabled", event.target.checked)}
                    className="size-4 accent-[#8B1E1E]"
                  />
                </label>

                {settings.announcementCtaEnabled ? (
                  <div className="mt-4">
                    <FormField label="Button destination">
                      <select value={settings.announcementCtaDestination} onChange={(event) => updateSetting("announcementCtaDestination", event.target.value)} className={fieldClassName}>
                        {STOREFRONT_NOTICE_DESTINATIONS.map((destination) => <option key={destination.id} value={destination.id}>{destination.label}</option>)}
                      </select>
                    </FormField>
                    <p className="mt-2 text-xs text-[#756D62]">The button text and destination are configured automatically.</p>
                  </div>
                ) : null}
              </div>
              <StorefrontNoticePreview activeCtaDestination={activeCtaDestination} activeNoticeType={activeNoticeType} activePriorityStyle={activePriorityStyle} settings={settings} />
            </CardContent>
          </Card>

          <Card className="border-[#E4DAC9] bg-[#FDFAF4]">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
              <div className="flex size-11 items-center justify-center rounded-lg bg-white text-[#8B1E1E]">
                <BellRing className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-[#2B2B2B]">Publishing note</p>
                <p className="mt-1 text-sm text-[#756D62]">
                  Saving publishes restaurant information, delivery pricing, opening hours, effects, and notices together in one transaction.
                </p>
              </div>
            </CardContent>
          </Card>
      </div>}
    </AdminShell>
  )
}

function FestivalSettingsPreview({ activeEffect, settings }) {
  const enabled = settings.festivalEffectEnabled && settings.festivalEffect !== "none"

  return (
    <div className="overflow-hidden rounded-lg border border-[#E4DAC9] bg-[#231F1A] text-white">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div><p className="text-sm font-semibold">Effect preview</p><p className="text-xs text-white/55">Matches the public storefront effect</p></div>
        <Eye className="size-4 text-[#D4A017]" />
      </div>
      <div className="relative min-h-64 overflow-hidden p-5">
        {enabled ? <FestivalEffectPreview effect={settings.festivalEffect} intensity={settings.effectIntensity} /> : null}
        <div className="relative z-10">
          <Badge className="bg-[#D4A017] text-[#2B2B2B]">{enabled ? activeEffect.label : "Disabled"}</Badge>
          <h3 className="mt-5 font-display text-3xl font-bold leading-tight">Hoa Phuong Do</h3>
          <p className="mt-2 max-w-md text-sm text-white/65">Vietnamese dining in Paphos with warm service and seasonal moments.</p>
        </div>
      </div>
    </div>
  )
}

function StorefrontNoticePreview({ activeCtaDestination, activeNoticeType, activePriorityStyle, settings }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E4DAC9] bg-[#231F1A]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
        <div><p className="text-sm font-semibold">Customer popup preview</p><p className="text-xs text-white/55">Updates as you edit the notice</p></div>
        <Eye className="size-4 text-[#D4A017]" />
      </div>
      <div className="flex min-h-72 items-center justify-center p-4 sm:p-6">
        {settings.announcementEnabled ? (
          <div className={`w-full max-w-2xl rounded-lg border bg-white p-4 text-[#2B2B2B] shadow-2xl sm:p-5 ${activePriorityStyle.border}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${activePriorityStyle.badge}`}>{settings.announcementPriority}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756D62]">{activeNoticeType.label}</span>
                </div>
                <p className="font-display text-xl font-bold sm:text-2xl">{settings.announcementTitle || activeNoticeType.title}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#756D62]">{settings.announcementMessage || activeNoticeType.message}</p>
                {settings.announcementStartDate || settings.announcementEndDate ? (
                  <div className="mt-3 flex items-start gap-2 text-xs text-[#756D62]"><CalendarDays className="mt-0.5 size-3.5 shrink-0" /><span>{settings.announcementStartDate || "Now"} to {settings.announcementEndDate || "manually disabled"}</span></div>
                ) : null}
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#F6F1E8] text-[#756D62]" aria-hidden="true"><X className="size-4" /></span>
            </div>
            {settings.announcementCtaEnabled ? (
              <span className="mt-4 inline-flex rounded-md bg-[#8B1E1E] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">{activeCtaDestination.label}</span>
            ) : null}
          </div>
        ) : (
          <div className="border border-white/10 bg-white/5 px-5 py-8 text-center text-sm text-white/65">Storefront notice is disabled.</div>
        )}
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, label, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        checked ? "bg-[#8B1E1E]" : "bg-[#D8CDBB]"
      }`}
      aria-label={label}
      aria-pressed={checked}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

function FormField({ children, label }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756D62]">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

function MoneyInput({ disabled, label, onChange, value }) {
  const inputRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  const normalize = () => {
    const amount = Number(value)
    if (Number.isFinite(amount)) onChange(amount.toFixed(2))
    setIsEditing(false)
  }

  return (
    <FormField label={label}>
      <span className="block">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={isEditing ? value : formatEuroInput(value)}
          onChange={(event) => onChange(sanitizeMoney(event.target.value))}
          onFocus={() => setIsEditing(true)}
          onBlur={normalize}
          className={`${fieldClassName} tabular-nums`}
          placeholder="€0.00"
          disabled={disabled}
          aria-label={`${label} in euro`}
        />
      </span>
    </FormField>
  )
}

function DecimalInput({ disabled, label, onChange, value }) {
  return (
    <FormField label={label}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(sanitizeDecimal(event.target.value, 2))}
        onBlur={() => {
          const amount = Number(value)
          if (Number.isFinite(amount)) onChange(amount.toFixed(2))
        }}
        className={`${fieldClassName} tabular-nums`}
        placeholder="0.00"
        disabled={disabled}
      />
    </FormField>
  )
}

function formatEuroInput(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? euroFormatter.format(amount) : value
}

function sanitizeMoney(value) {
  const normalized = String(value).replace(",", ".").replace(/[^\d.]/g, "")
  const [whole = "", ...decimalParts] = normalized.split(".")
  const decimal = decimalParts.join("").slice(0, 2)
  return decimalParts.length ? `${whole.slice(0, 3)}.${decimal}` : whole.slice(0, 3)
}

function sanitizeDecimal(value, decimalPlaces = 2) {
  const normalized = String(value).replace(",", ".").replace(/[^\d.]/g, "")
  const [whole = "", ...decimalParts] = normalized.split(".")
  const decimal = decimalParts.join("").slice(0, decimalPlaces)
  return decimalParts.length ? `${whole.slice(0, 3)}.${decimal}` : whole.slice(0, 3)
}

const fieldClassName = "w-full rounded-lg border border-[#E4DAC9] bg-white px-3 py-2 text-sm text-[#2B2B2B] outline-none transition-colors placeholder:text-[#B4A99A] focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10 disabled:bg-[#F6F1E8] disabled:text-[#9B9285]"
