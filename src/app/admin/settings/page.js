"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BellRing, CalendarDays, Clock3, Eye, LoaderCircle, Megaphone, Plus, Save, Sparkles, Trash2, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import AdminToast from "@/app/admin/_components/AdminToast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const effectOptions = [
  { id: "none", label: "None", description: "No seasonal overlay" },
  { id: "tet", label: "Tet", description: "Warm blossom petals and lucky red accents" },
  { id: "christmas", label: "Christmas", description: "Soft snow and festive highlights" },
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
    ctaLabel: "View opening hours",
    ctaHref: "/contact",
  },
  {
    id: "holiday-hours",
    label: "Holiday hours",
    description: "Use for Christmas, Tet, Easter, or special holiday opening times.",
    title: "Holiday opening hours",
    message: "Our opening hours are slightly different during the holiday period. Please check before visiting or booking.",
    ctaLabel: "Book a table",
    ctaHref: "/book-table",
  },
  {
    id: "promotion",
    label: "Promotion",
    description: "Use for special offers, new dishes, discounts, or weekend campaigns.",
    title: "Weekend special",
    message: "Book a table this weekend and enjoy a complimentary Vietnamese iced tea with your meal.",
    ctaLabel: "Book a table",
    ctaHref: "/book-table",
  },
  {
    id: "general",
    label: "General notice",
    description: "Use for regular restaurant announcements.",
    title: "Restaurant notice",
    message: "A short update for our guests.",
    ctaLabel: "",
    ctaHref: "",
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
  openingHours: [
    { clientId: "weekday", day: "Monday - Friday", openTime: "11:00", closeTime: "22:00", isClosed: false },
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
  announcementCtaLabel: "View opening hours",
  announcementCtaHref: "/contact",
  announcementStartDate: "",
  announcementEndDate: "",
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(initialSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const toastIdRef = useRef(0)

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/admin/settings", { cache: "no-store", signal: controller.signal })
      .then(readApi)
      .then(({ data }) => setSettings((current) => ({
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
        announcementEnabled: data.notice.enabled,
        announcementType: noticeTypeFromApi[data.notice.type] || "general",
        announcementPriority: titleCase(data.notice.priority),
        announcementTitle: data.notice.title,
        announcementMessage: data.notice.message,
        announcementCtaEnabled: data.notice.ctaEnabled,
        announcementCtaLabel: data.notice.ctaLabel,
        announcementCtaHref: data.notice.ctaHref,
        announcementStartDate: data.notice.startsAt,
        announcementEndDate: data.notice.endsAt,
      })))
      .catch((error) => { if (error.name !== "AbortError") showToast(error.message || "Could not load settings.", "error") })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
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

  const updateSetting = (field, value) => {
    setSettings((previous) => ({ ...previous, [field]: value }))
  }

  const updateOpeningHour = (clientId, field, value) => {
    setSettings((previous) => ({ ...previous, openingHours: previous.openingHours.map((entry) => entry.clientId === clientId ? { ...entry, [field]: value } : entry) }))
  }

  const addOpeningHour = () => {
    setSettings((previous) => ({ ...previous, openingHours: [...previous.openingHours, { clientId: `new-${Date.now()}`, day: "", openTime: "11:00", closeTime: "22:00", isClosed: false }] }))
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

  const removeOpeningHour = (clientId) => {
    setSettings((previous) => ({ ...previous, openingHours: previous.openingHours.filter((entry) => entry.clientId !== clientId) }))
  }

  const updateNoticeType = (noticeTypeId) => {
    const noticeType = noticeTypeOptions.find((notice) => notice.id === noticeTypeId) || noticeTypeOptions[0]

    setSettings((previous) => ({
      ...previous,
      announcementType: noticeType.id,
      announcementTitle: noticeType.title,
      announcementMessage: noticeType.message,
      announcementCtaEnabled: Boolean(noticeType.ctaLabel),
      announcementCtaLabel: noticeType.ctaLabel,
      announcementCtaHref: noticeType.ctaHref,
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
          storefront: { festivalEffectEnabled: settings.festivalEffectEnabled, festivalEffect: effectToApi[settings.festivalEffect], effectIntensity: settings.effectIntensity, startsAt: settings.festivalEffectStartDate, endsAt: settings.festivalEffectEndDate },
          notice: { enabled: settings.announcementEnabled, type: noticeTypeToApi[settings.announcementType], priority: settings.announcementPriority.toUpperCase(), title: settings.announcementTitle, message: settings.announcementMessage, ctaEnabled: settings.announcementCtaEnabled, ctaLabel: settings.announcementCtaLabel, ctaHref: settings.announcementCtaHref, startsAt: settings.announcementStartDate, endsAt: settings.announcementEndDate },
        }),
      }).then(readApi)
      setSettings((current) => ({ ...current, openingHours: payload.data.openingHours.map((entry, index) => ({ ...entry, clientId: entry.id || `saved-${index}` })) }))
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
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
            <CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle className="font-display text-xl">Opening hours</CardTitle><CardDescription>Add and complete each schedule row like a todo list.</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={addOpeningHour} disabled={loading}><Plus className="size-4" />Add row</Button></CardHeader>
            <CardContent className="space-y-3">
              {settings.openingHours.length ? settings.openingHours.map((entry) => <div key={entry.clientId} className="grid gap-3 border border-[#E4DAC9] bg-[#FAF7F0] p-3 sm:grid-cols-[minmax(9rem,1fr)_8rem_8rem_auto] sm:items-end">
                <FormField label="Day or label"><input value={entry.day} onChange={(event) => updateOpeningHour(entry.clientId, "day", event.target.value)} className={fieldClassName} maxLength={50} disabled={loading} placeholder="Monday - Friday" /></FormField>
                <FormField label="Opens"><input type="time" value={entry.openTime} onChange={(event) => updateOpeningHour(entry.clientId, "openTime", event.target.value)} className={fieldClassName} disabled={loading || entry.isClosed} /></FormField>
                <FormField label="Closes"><input type="time" value={entry.closeTime} onChange={(event) => updateOpeningHour(entry.clientId, "closeTime", event.target.value)} className={fieldClassName} disabled={loading || entry.isClosed} /></FormField>
                <div className="flex items-center justify-between gap-2 sm:pb-0.5"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={entry.isClosed} onChange={(event) => updateOpeningHour(entry.clientId, "isClosed", event.target.checked)} className="size-4 accent-[#8B1E1E]" disabled={loading} />Closed</label><Button type="button" variant="destructive" size="icon-sm" onClick={() => removeOpeningHour(entry.clientId)} disabled={loading} aria-label={`Delete ${entry.day || "opening hour"}`}><Trash2 className="size-4" /></Button></div>
              </div>) : <div className="border border-dashed border-[#E4DAC9] bg-[#FAF7F0] p-8 text-center"><Clock3 className="mx-auto size-6 text-[#8B1E1E]" /><p className="mt-2 text-sm font-semibold">No opening hours added.</p></div>}
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
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <FormField label="Button label">
                      <input
                        value={settings.announcementCtaLabel}
                        onChange={(event) => updateSetting("announcementCtaLabel", event.target.value)}
                        className={fieldClassName}
                        placeholder="View opening hours"
                      />
                    </FormField>
                    <FormField label="Button link">
                      <input
                        value={settings.announcementCtaHref}
                        onChange={(event) => updateSetting("announcementCtaHref", event.target.value)}
                        className={fieldClassName}
                        placeholder="/contact"
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>
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
                  Saving publishes restaurant information, opening hours, effects, and notices together in one transaction.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="border-[#E4DAC9] bg-white">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-display text-xl">Preview</CardTitle>
                  <CardDescription>How the storefront add-ons will feel</CardDescription>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#F6F1E8] text-[#8B1E1E]">
                  <Eye className="size-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[460px] overflow-hidden rounded-lg border border-[#E4DAC9] bg-[#231F1A] text-white">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(139,30,30,0.78),rgba(35,31,26,0.9)),url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80')] bg-cover bg-center" />
                {settings.festivalEffectEnabled && settings.festivalEffect !== "none" ? (
                  <FestivalPreview effect={settings.festivalEffect} intensity={settings.effectIntensity} />
                ) : null}
                <div className="relative z-10 flex min-h-[460px] flex-col justify-between p-5">
                  <div>
                    <Badge className="bg-[#D4A017] text-[#2B2B2B]">{activeEffect.label}</Badge>
                    <h3 className="mt-5 font-display text-4xl font-bold leading-tight">Hoa Phuong Do</h3>
                    <p className="mt-3 max-w-xs text-sm text-white/70">Vietnamese dining in Paphos with warm service and seasonal moments.</p>
                  </div>

                  {settings.announcementEnabled ? (
                    <div className={`rounded-lg border bg-white p-4 text-[#2B2B2B] shadow-2xl ${activePriorityStyle.border}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${activePriorityStyle.badge}`}>
                              {settings.announcementPriority}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756D62]">
                              {activeNoticeType.label}
                            </span>
                          </div>
                          <p className="font-display text-xl font-bold">{settings.announcementTitle || activeNoticeType.title}</p>
                          <p className="mt-2 text-sm leading-relaxed text-[#756D62]">
                            {settings.announcementMessage || activeNoticeType.message}
                          </p>
                          {settings.announcementStartDate || settings.announcementEndDate ? (
                            <div className="mt-3 flex items-center gap-2 text-xs text-[#756D62]">
                              <CalendarDays className="size-3.5" />
                              <span>
                                {settings.announcementStartDate || "Now"} to {settings.announcementEndDate || "manually disabled"}
                              </span>
                            </div>
                          ) : null}
                        </div>
                        <button type="button" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#F6F1E8] text-[#756D62]" aria-label="Close preview popup">
                          <X className="size-4" />
                        </button>
                      </div>
                      {settings.announcementCtaEnabled && settings.announcementCtaLabel ? (
                        <div className="mt-4 inline-flex rounded-md bg-[#8B1E1E] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
                          {settings.announcementCtaLabel}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-white/10 p-4 text-sm text-white/70">
                      Popup disabled
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AdminShell>
  )
}

function FestivalPreview({ effect, intensity }) {
  const count = intensity === "High" ? 18 : intensity === "Low" ? 7 : 12
  const colors = {
    tet: ["#F4A3AD", "#D4A017", "#F7C7CD"],
    christmas: ["#FFFFFF", "#EAF3F7", "#FFFFFF"],
    "new-year": ["#D4A017", "#8B1E1E", "#2F6F55"],
    valentine: ["#C94B63", "#EF9AAA", "#8B1E1E"],
    summer: ["#4D7B4B", "#7C9F55", "#D4A017"],
  }[effect] || ["#FFFFFF"]

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="absolute block"
          style={{
            left: `${(index * 19) % 96}%`,
            top: `${(index * 31) % 92}%`,
            opacity: 0.32 + (index % 4) * 0.13,
            width: effect === "new-year" ? 5 : 7 + (index % 3) * 2,
            height: effect === "new-year" ? 12 : effect === "summer" ? 14 : 7 + (index % 3) * 2,
            borderRadius: effect === "christmas" ? "999px" : effect === "new-year" ? "1px" : "75% 15% 70% 25%",
            backgroundColor: colors[index % colors.length],
            transform: `rotate(${index * 37}deg)`,
          }}
        />
      ))}
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

const fieldClassName = "w-full rounded-lg border border-[#E4DAC9] bg-white px-3 py-2 text-sm text-[#2B2B2B] outline-none transition-colors placeholder:text-[#B4A99A] focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10 disabled:bg-[#F6F1E8] disabled:text-[#9B9285]"
