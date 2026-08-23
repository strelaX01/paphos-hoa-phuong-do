"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { CalendarCheck, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Pencil, RefreshCw, Search, Trash2, UsersRound, Utensils, X, XCircle } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import AdminToast from "@/app/admin/_components/AdminToast"
import { MetricGridSkeleton, ResponsiveListSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { dedupeClientRequest } from "@/lib/dedupeClientRequest"
import { RESERVATION_STATUSES } from "@/lib/reservationStatus"
import { useModalDialog } from "@/hooks/useModalDialog"

const statusVariant = { PENDING: "warning", CONFIRMED: "info", COMPLETED: "success", CANCELLED: "destructive" }
const statusRowAccent = { PENDING: "border-l-amber-400", CONFIRMED: "border-l-sky-500", COMPLETED: "border-l-emerald-500", CANCELLED: "border-l-red-500" }
const statusDotTone = { PENDING: "bg-amber-500", CONFIRMED: "bg-sky-500", COMPLETED: "bg-emerald-500", CANCELLED: "bg-red-500" }
const fieldClassName = "w-full rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10"
const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "next7", label: "Next 7 days" },
  { value: "all", label: "All dates" },
]
const ACTIVE_RESERVATION_STATUSES = RESERVATION_STATUSES.filter((status) => status !== "CANCELLED")
const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...RESERVATION_STATUSES.map((status) => ({ value: status, label: formatStatus(status) })),
]

async function readApi(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const firstError = payload.errors ? Object.values(payload.errors)[0] : null
    throw new Error(firstError || payload.error || "Request failed.")
  }
  return payload
}

export default function ReservationsManager() {
  const [reservations, setReservations] = useState([])
  const [summary, setSummary] = useState({ todayBookings: 0, todaySeats: 0, confirmed: 0, pending: 0 })
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query.trim())
  const [status, setStatus] = useState("")
  const [datePreset, setDatePreset] = useState("today")
  const [customDate, setCustomDate] = useState("")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)
  const toastIdRef = useRef(0)
  const dateFilter = useMemo(() => getDateFilter(datePreset, customDate), [customDate, datePreset])

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }

  useEffect(() => {
    let refreshTimer
    const refreshReservations = () => {
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => setRefreshKey((key) => key + 1), 75)
    }
    const refreshNewReservations = () => {
      setPage(1)
      refreshReservations()
    }
    window.addEventListener("new-reservation-received", refreshNewReservations)
    window.addEventListener("reservation-data-changed", refreshReservations)
    return () => {
      window.clearTimeout(refreshTimer)
      window.removeEventListener("new-reservation-received", refreshNewReservations)
      window.removeEventListener("reservation-data-changed", refreshReservations)
    }
  }, [])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page), limit: "24" })
    if (deferredQuery) params.set("q", deferredQuery)
    if (status) params.set("status", status)
    if (dateFilter.from) params.set("from", dateFilter.from)
    if (dateFilter.to) params.set("to", dateFilter.to)
    const url = `/api/admin/reservations?${params}`
    dedupeClientRequest(url, () => {
      return fetch(url).then(readApi)
    })
      .then((payload) => { if (active) { setReservations(payload.data); setSelected((current) => current ? payload.data.find((entry) => entry.id === current.id) || current : current); setPagination(payload.pagination); setSummary(payload.summary) } })
      .catch((error) => { if (active) showToast(error.message || "Could not load reservations.", "error") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [dateFilter.from, dateFilter.to, deferredQuery, page, refreshKey, status])

  const patchStatus = async (reservation, nextStatus) => {
    setBusyId(reservation.id)
    try {
      const payload = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }).then(readApi)
      setReservations((current) => current.map((entry) => entry.id === reservation.id ? payload.data : entry))
      if (nextStatus === "CANCELLED") setCancelling(null)
      setRefreshKey((key) => key + 1)
      window.dispatchEvent(new Event("reservation-count-changed"))
      showToast("Reservation status updated.")
    } catch (error) {
      showToast(error.message || "Could not update reservation.", "error")
    } finally {
      setBusyId(null)
    }
  }

  const saveReservation = async (reservation, changes) => {
    setBusyId(reservation.id)
    try {
      const payload = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      }).then(readApi)
      setReservations((current) => current.map((entry) => entry.id === reservation.id ? payload.data : entry))
      setSelected(null)
      setRefreshKey((key) => key + 1)
      window.dispatchEvent(new Event("reservation-count-changed"))
      showToast("Reservation updated.")
    } catch (error) {
      showToast(error.message || "Could not update reservation.", "error")
      throw error
    } finally {
      setBusyId(null)
    }
  }

  const deleteReservation = async (reservation) => {
    setBusyId(reservation.id)
    try {
      await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "DELETE",
      }).then(readApi)
      setDeleting(null)
      if (reservations.length === 1 && page > 1) setPage((current) => current - 1)
      else setRefreshKey((key) => key + 1)
      window.dispatchEvent(new Event("reservation-count-changed"))
      showToast("Reservation deleted.")
    } catch (error) {
      showToast(error.message || "Could not delete reservation.", "error")
    } finally {
      setBusyId(null)
    }
  }

  const metrics = useMemo(() => [
    { label: "Bookings today", value: summary.todayBookings, detail: `${summary.todaySeats} seats reserved`, icon: CalendarCheck },
    { label: "Confirmed", value: summary.confirmed, detail: "Ready for service", icon: UsersRound },
    { label: "Pending review", value: summary.pending, detail: "Need confirmation", icon: Clock3 },
    { label: "Matching bookings", value: pagination.total, detail: status || deferredQuery || datePreset !== "all" ? "Current filters" : "All reservations", icon: Utensils },
  ], [datePreset, deferredQuery, pagination.total, status, summary])

  return (
    <AdminShell active="reservations" eyebrow="Dining room" title="Reservations" description="Review, edit, and manage table bookings." action={<Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1) }} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>}>
      <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />
      <div className="space-y-5">
        {loading ? <MetricGridSkeleton /> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Reservation metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>}
        <section className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
              <div><h2 className="font-display text-xl font-semibold">Reservation schedule</h2><p className="text-sm text-[#756D62]">{pagination.total} matching bookings</p></div>
              <p className="text-xs font-medium text-[#756D62]">Bookings are ordered by reservation time</p>
            </div>
            <div className="border border-[#E4DAC9] bg-[#FDFAF4] p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <CalendarDays className="hidden size-4 shrink-0 text-[#8B1E1E] sm:block" aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-md bg-[#F1EADF] p-1" role="group" aria-label="Reservation date range">
                    {DATE_PRESETS.map((preset) => <button key={preset.value} type="button" aria-pressed={datePreset === preset.value} onClick={() => { setLoading(true); setDatePreset(preset.value); setPage(1) }} className={`h-8 shrink-0 rounded px-3 text-xs font-semibold transition-colors sm:text-sm ${datePreset === preset.value ? "bg-white text-[#8B1E1E] shadow-sm" : "text-[#756D62] hover:bg-white/65 hover:text-[#2B2B2B]"}`}>{preset.label}</button>)}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_170px]">
                  <label className="relative"><span className="sr-only">Search reservations</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" /><input value={query} onChange={(event) => { const nextQuery = event.target.value; if (nextQuery.trim() !== deferredQuery) setLoading(true); setQuery(nextQuery); setPage(1) }} className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E]" placeholder="Name, email, or phone" /></label>
                  <ReservationStatusFilter value={status} onChange={(value) => { setLoading(true); setStatus(value); setPage(1) }} />
                  <DateFilterInput value={customDate} active={datePreset === "custom"} onChange={(value) => { setLoading(true); setCustomDate(value); setDatePreset(value ? "custom" : "today"); setPage(1) }} />
                </div>
              </div>
            </div>
          </div>
          {loading ? <ResponsiveListSkeleton rows={6} columns={7} /> : reservations.length ? (
            <ReservationsList reservations={reservations} busyId={busyId} onCancel={setCancelling} onDelete={setDeleting} onEdit={setSelected} onStatus={patchStatus} />
          ) : <EmptyState datePreset={datePreset} />}
          {pagination.totalPages > 1 ? <div className="flex items-center justify-between border-t border-[#E4DAC9] pt-4"><p className="text-sm text-[#756D62]">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><PageButton label="Previous page" disabled={loading || page <= 1} icon={ChevronLeft} onClick={() => { setLoading(true); setPage((value) => value - 1) }} /><PageButton label="Next page" disabled={loading || page >= pagination.totalPages} icon={ChevronRight} onClick={() => { setLoading(true); setPage((value) => value + 1) }} /></div></div> : null}
        </section>
      </div>
      {selected ? <ReservationModal reservation={selected} busy={busyId === selected.id} onClose={() => setSelected(null)} onSave={(changes) => saveReservation(selected, changes)} /> : null}
      {cancelling ? <CancelReservationModal reservation={cancelling} busy={busyId === cancelling.id} onCancel={() => setCancelling(null)} onConfirm={() => patchStatus(cancelling, "CANCELLED")} /> : null}
      {deleting ? <DeleteReservationModal reservation={deleting} busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={() => deleteReservation(deleting)} /> : null}
    </AdminShell>
  )
}

function ReservationsList({ busyId, onCancel, onDelete, onEdit, onStatus, reservations }) {
  const groups = useMemo(() => groupReservationsByDate(reservations), [reservations])

  return <div className="space-y-5">{groups.map((group) => (
    <section key={group.date} aria-labelledby={`reservation-day-${group.date}`}>
      <div className="flex items-center justify-between border border-b-0 border-[#E4DAC9] bg-[#F6F1E8] px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2"><h3 id={`reservation-day-${group.date}`} className="truncate font-display text-lg font-semibold">{formatReservationDay(group.date)}</h3><span className="shrink-0 text-xs text-[#756D62]">{formatDateOnly(group.date)}</span></div>
        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold tabular-nums text-[#756D62] ring-1 ring-black/8">{group.reservations.length} {group.reservations.length === 1 ? "booking" : "bookings"}</span>
      </div>
      <div className="hidden border border-[#E4DAC9] bg-white xl:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup><col className="w-[8%]" /><col className="w-[20%]" /><col className="w-[7%]" /><col className="w-[20%]" /><col className="w-[14%]" /><col className="w-[13%]" /><col className="w-[18%]" /></colgroup>
          <thead className="border-b border-[#D8CEBD] bg-[#FDFAF4] text-[11px] font-semibold uppercase text-[#756D62]"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Guest</th><th className="px-4 py-3 text-center">Guests</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-[#D8CEBD]">{group.reservations.map((reservation, index) => <ReservationRow key={reservation.id} reservation={reservation} index={index} busy={busyId === reservation.id} onCancel={() => onCancel(reservation)} onDelete={() => onDelete(reservation)} onEdit={() => onEdit(reservation)} onStatus={(nextStatus) => onStatus(reservation, nextStatus)} />)}</tbody>
        </table>
      </div>
      <div className="grid gap-3 border-x border-b border-[#E4DAC9] bg-white p-3 xl:hidden">{group.reservations.map((reservation) => <ReservationMobileRow key={reservation.id} reservation={reservation} busy={busyId === reservation.id} onCancel={() => onCancel(reservation)} onDelete={() => onDelete(reservation)} onEdit={() => onEdit(reservation)} onStatus={(nextStatus) => onStatus(reservation, nextStatus)} />)}</div>
    </section>
  ))}</div>
}

function ReservationRow({ busy, index, onCancel, onDelete, onEdit, onStatus, reservation }) {
  const rowTone = reservation.status === "PENDING"
    ? "[&>td]:bg-[#FFF0C2] hover:[&>td]:bg-[#FFE4A3]"
    : reservation.status === "CANCELLED"
      ? `${index % 2 ? "[&>td]:bg-red-50/55" : "[&>td]:bg-red-50/30"} hover:[&>td]:bg-red-100/70`
      : reservation.status === "CONFIRMED"
        ? "[&>td]:bg-sky-50/65 hover:[&>td]:bg-sky-100/70"
        : "[&>td]:bg-emerald-50/45 hover:[&>td]:bg-emerald-100/55"
  return <tr className={`${rowTone} align-middle [&>td]:transition-colors`}>
    <td className={`whitespace-nowrap border-l-4 px-4 py-4 ${statusRowAccent[reservation.status] || "border-l-[#D8CEBD]"}`}><p className="font-mono text-base font-bold tabular-nums text-[#8B1E1E]">{reservation.time}</p></td>
    <td className="min-w-0 px-4 py-4"><button type="button" onClick={onEdit} className="block max-w-full truncate font-semibold hover:text-[#8B1E1E] hover:underline">{reservation.name}</button><p className="mt-1 truncate text-xs text-[#756D62]">{reservation.phone}</p><p className="mt-0.5 truncate text-xs text-[#756D62]">{reservation.email}</p></td>
    <td className="px-4 py-4 text-center"><span className="inline-flex min-w-8 items-center justify-center rounded-md bg-white px-2 py-1 font-bold tabular-nums ring-1 ring-black/8">{reservation.guests}</span></td>
    <td className="min-w-0 px-4 py-4"><p className="truncate text-[#756D62]" title={reservation.requests || undefined}>{reservation.requests || "-"}</p></td>
    <td className="whitespace-nowrap px-4 py-4 text-xs text-[#756D62]">{formatDateTime(reservation.createdAt)}</td>
    <td className="px-4 py-4"><ReservationStatusSelect reservation={reservation} busy={busy} onStatus={onStatus} /></td>
    <td className="px-4 py-4"><ReservationActions reservation={reservation} busy={busy} onCancel={onCancel} onDelete={onDelete} onEdit={onEdit} onStatus={onStatus} compact /></td>
  </tr>
}

function ReservationMobileRow({ busy, onCancel, onDelete, onEdit, onStatus, reservation }) {
  const background = reservation.status === "PENDING"
    ? "border-[#D4A017] bg-[#FFF0C2] shadow-[inset_4px_0_0_#B7791F]"
    : reservation.status === "CANCELLED"
      ? "border-red-200 bg-red-50/35"
      : reservation.status === "CONFIRMED"
        ? "border-sky-200 bg-sky-50/65 shadow-[inset_4px_0_0_#0EA5E9]"
        : "border-emerald-200 bg-emerald-50/45 shadow-[inset_4px_0_0_#10B981]"
  return <article className={`border p-4 ${background}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{reservation.name}</p><p className="mt-1 truncate text-xs text-[#756D62]">{reservation.email} | {reservation.phone}</p></div><Badge variant={statusVariant[reservation.status]}>{formatStatus(reservation.status)}</Badge></div><div className="mt-4 grid grid-cols-3 gap-3 border-y border-black/8 py-3 text-sm"><Info label="Time" value={reservation.time} /><Info label="Guests" value={reservation.guests} /><Info label="Received" value={formatShortDate(reservation.createdAt)} /></div>{reservation.requests ? <p className="mt-3 line-clamp-2 text-sm text-[#756D62]">{reservation.requests}</p> : null}<div className="mt-4"><ReservationActions reservation={reservation} busy={busy} onCancel={onCancel} onDelete={onDelete} onEdit={onEdit} onStatus={onStatus} /></div></article>
}

function ReservationActions({ busy, compact = false, onCancel, onDelete, onEdit, onStatus, reservation }) {
  const canCancel = ["PENDING", "CONFIRMED"].includes(reservation.status)
  return <div className={`flex items-center gap-2 ${compact ? "flex-nowrap justify-end" : "flex-wrap justify-start"}`}>{compact ? null : <ReservationStatusMenu reservation={reservation} busy={busy} onStatus={onStatus} />}{canCancel ? <Button variant="destructive" size="sm" onClick={onCancel} disabled={busy}><XCircle className="size-4" />Cancel</Button> : null}<Button variant="outline" size={compact ? "icon-sm" : "sm"} onClick={onEdit} aria-label={`Edit reservation for ${reservation.name}`} title="Edit reservation"><Pencil className="size-4" />{compact ? null : "Edit"}</Button><Button variant="destructive" size="icon-sm" onClick={onDelete} disabled={busy} aria-label={`Delete reservation for ${reservation.name}`} title="Delete reservation"><Trash2 className="size-4" /></Button></div>
}

function ReservationStatusMenu({ busy, onStatus, reservation }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsidePress = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false) }
    document.addEventListener("pointerdown", closeOnOutsidePress)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  if (reservation.status === "CANCELLED") return null

  return <div ref={rootRef} className="relative w-full"><button type="button" onClick={() => setOpen((current) => !current)} disabled={busy} aria-haspopup="listbox" aria-expanded={open} className="flex h-10 w-full items-center justify-between gap-3 rounded-md border border-[#D8CEBD] bg-white px-3 text-left text-sm font-medium outline-none focus-visible:border-[#8B1E1E] focus-visible:ring-2 focus-visible:ring-[#8B1E1E]/10 disabled:opacity-60"><span className="flex min-w-0 items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${statusDotTone[reservation.status]}`} aria-hidden="true" /><span className="truncate">{formatStatus(reservation.status)}</span></span><ChevronDown className={`size-4 shrink-0 text-[#756D62] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /></button>{open ? <div className="absolute bottom-full left-0 right-0 z-30 mb-1 overflow-hidden rounded-md border border-[#D8CEBD] bg-white p-1 shadow-xl" role="listbox" aria-label={`Status for ${reservation.name}`}>{ACTIVE_RESERVATION_STATUSES.map((status) => { const active = reservation.status === status; return <button key={status} type="button" role="option" aria-selected={active} onClick={() => { if (!active) onStatus(status); setOpen(false) }} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm ${active ? "bg-[#F6F1E8] font-semibold text-[#8B1E1E]" : "text-[#2B2B2B] active:bg-[#F6F1E8]"}`}><span className="flex items-center gap-2"><span className={`size-2 rounded-full ${statusDotTone[status]}`} aria-hidden="true" />{formatStatus(status)}</span>{active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}</button> })}</div> : null}</div>
}

function ReservationStatusSelect({ busy, onStatus, reservation }) {
  if (reservation.status === "CANCELLED") return <Badge variant="destructive">Cancelled</Badge>

  return <select value={reservation.status} onChange={(event) => onStatus(event.target.value)} disabled={busy} aria-label={`Status for ${reservation.name}`} className="h-9 w-full min-w-0 rounded-md border border-[#E4DAC9] bg-white px-2 text-sm outline-none focus:border-[#8B1E1E]">{ACTIVE_RESERVATION_STATUSES.map((option) => <option key={option} value={option}>{formatStatus(option)}</option>)}</select>
}

function DateFilterInput({ active, onChange, value }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => (value || getCyprusDateString()).slice(0, 7))
  const calendarDays = useMemo(() => buildCalendarDays(month), [month])

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsidePress = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false) }
    document.addEventListener("pointerdown", closeOnOutsidePress)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  const toggleCalendar = () => {
    if (!open) setMonth((value || getCyprusDateString()).slice(0, 7))
    setOpen((current) => !current)
  }

  return <div ref={rootRef} className="relative"><button type="button" onClick={toggleCalendar} aria-haspopup="dialog" aria-expanded={open} className={`flex h-9 w-full items-center gap-2 rounded-md border bg-white px-3 pr-10 text-left text-sm tabular-nums outline-none transition-colors hover:border-[#D4A017] focus-visible:border-[#8B1E1E] focus-visible:ring-2 focus-visible:ring-[#8B1E1E]/10 ${active ? "border-[#8B1E1E] ring-2 ring-[#8B1E1E]/10" : "border-[#E4DAC9]"}`} aria-label={`Choose a specific reservation date. ${value ? formatFilterDate(value) : "No date selected"}`}><CalendarDays className="size-4 shrink-0 text-[#8B1E1E]" aria-hidden="true" /><span className={value ? "text-[#2B2B2B]" : "text-[#9B9285]"}>{formatFilterDate(value)}</span></button>{value ? <button type="button" onClick={() => { onChange(""); setOpen(false) }} className="absolute right-1 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded bg-white text-[#756D62] hover:bg-[#F2EAD8] hover:text-[#8B1E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]" aria-label="Clear reservation date filter"><X className="size-4" /></button> : null}{open ? <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[#D8CEBD] bg-white p-3 shadow-xl sm:left-auto sm:w-72" role="dialog" aria-label="Choose reservation date"><div className="flex items-center justify-between"><button type="button" onClick={() => setMonth((current) => shiftCalendarMonth(current, -1))} className="flex size-9 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#8B1E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]" aria-label="Previous month"><ChevronLeft className="size-4" /></button><p className="font-semibold">{formatCalendarMonth(month)}</p><button type="button" onClick={() => setMonth((current) => shiftCalendarMonth(current, 1))} className="flex size-9 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#8B1E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]" aria-label="Next month"><ChevronRight className="size-4" /></button></div><div className="mt-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-[#9B9285]" aria-hidden="true">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day} className="py-1">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{calendarDays.map((day, index) => day ? <button key={day.iso} type="button" onClick={() => { onChange(day.iso); setOpen(false) }} aria-label={formatDateOnly(day.iso)} aria-pressed={day.iso === value} className={`flex aspect-square min-h-9 items-center justify-center rounded text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E] ${day.iso === value ? "bg-[#8B1E1E] font-semibold text-white" : day.iso === getCyprusDateString() ? "bg-[#F6F1E8] font-semibold text-[#8B1E1E] ring-1 ring-[#D4A017]" : "text-[#2B2B2B] hover:bg-[#F6F1E8]"}`}>{day.day}</button> : <span key={`empty-${index}`} aria-hidden="true" />)}</div></div> : null}</div>
}

function ReservationStatusFilter({ onChange, value }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const selected = STATUS_FILTER_OPTIONS.find((option) => option.value === value) || STATUS_FILTER_OPTIONS[0]

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsidePress = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false) }
    const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false) }
    document.addEventListener("pointerdown", closeOnOutsidePress)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  return <div ref={rootRef} className="relative"><button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={open} className="flex h-9 w-full items-center justify-between gap-3 rounded-md border border-[#E4DAC9] bg-white px-3 text-left text-sm outline-none transition-colors hover:border-[#D4A017] focus-visible:border-[#8B1E1E] focus-visible:ring-2 focus-visible:ring-[#8B1E1E]/10"><span className="flex min-w-0 items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${statusDotTone[selected.value] || "bg-[#9B9285]"}`} aria-hidden="true" /><span className="truncate">{selected.label}</span></span><ChevronDown className={`size-4 shrink-0 text-[#756D62] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" /></button>{open ? <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-[#D8CEBD] bg-white p-1 shadow-xl" role="listbox" aria-label="Filter reservations by status">{STATUS_FILTER_OPTIONS.map((option) => { const active = option.value === value; return <button key={option.value || "all"} type="button" role="option" aria-selected={active} onClick={() => { if (!active) onChange(option.value); setOpen(false) }} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm ${active ? "bg-[#F6F1E8] font-semibold text-[#8B1E1E]" : "text-[#2B2B2B] active:bg-[#F6F1E8]"}`}><span className="flex min-w-0 items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${statusDotTone[option.value] || "bg-[#9B9285]"}`} aria-hidden="true" /><span className="truncate">{option.label}</span></span>{active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}</button> })}</div> : null}</div>
}

function ReservationModal({ busy, onClose, onSave, reservation }) {
  const [form, setForm] = useState({ name: reservation.name, email: reservation.email, phone: reservation.phone, guests: String(reservation.guests), date: reservation.date, time: reservation.time, status: reservation.status, requests: reservation.requests, internalNote: reservation.internalNote })
  const [error, setError] = useState("")
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setError("") }
  const save = async (event) => { event.preventDefault(); setError(""); try { await onSave(form) } catch (saveError) { setError(saveError.message || "Could not save reservation.") } }
  return <Modal title="Edit reservation" onClose={onClose} locked={busy}><form className="space-y-5 p-5" onSubmit={save}><p className="text-sm font-semibold">{reservation.name} <span className="font-normal text-[#756D62]">| Received {formatDateTime(reservation.createdAt)}</span></p><div className="grid gap-4 sm:grid-cols-2"><EditField label="Guest name"><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => update("name", event.target.value)} className={fieldClassName} /></EditField><EditField label="Email"><input required type="email" maxLength={254} value={form.email} onChange={(event) => update("email", event.target.value)} className={fieldClassName} /></EditField><EditField label="Phone"><input required type="tel" maxLength={30} value={form.phone} onChange={(event) => update("phone", sanitizePhone(event.target.value))} className={fieldClassName} /></EditField><EditField label="Guests"><input required type="number" min="1" max="20" value={form.guests} onChange={(event) => update("guests", event.target.value)} className={fieldClassName} /></EditField><EditField label="Date"><input required type="date" value={form.date} onChange={(event) => update("date", event.target.value)} className={fieldClassName} /></EditField><EditField label="Time"><input required type="time" value={form.time} onChange={(event) => update("time", event.target.value)} className={fieldClassName} /></EditField></div><EditField label="Status">{form.status === "CANCELLED" ? <div className={`${fieldClassName} flex items-center`}><Badge variant="destructive">Cancelled</Badge></div> : <select value={form.status} onChange={(event) => update("status", event.target.value)} className={fieldClassName}>{ACTIVE_RESERVATION_STATUSES.map((option) => <option key={option} value={option}>{formatStatus(option)}</option>)}</select>}</EditField><EditField label="Special requests"><textarea value={form.requests} onChange={(event) => update("requests", event.target.value)} maxLength={1000} rows={3} className={fieldClassName} /></EditField><EditField label="Internal note"><textarea value={form.internalNote} onChange={(event) => update("internalNote", event.target.value)} maxLength={2000} rows={4} className={fieldClassName} placeholder="Visible to admin only" /></EditField>{error ? <p className="bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}<div className="flex justify-end gap-2 border-t border-[#E4DAC9] pt-4"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />}{busy ? "Saving..." : "Save changes"}</Button></div></form></Modal>
}

function CancelReservationModal({ busy, onCancel, onConfirm, reservation }) {
  return <Modal title="Cancel reservation?" onClose={onCancel} locked={busy} layer="z-[60]"><div className="space-y-5 p-5"><p className="text-sm text-[#756D62]">The booking will remain in the reservation history, but it will no longer be included in active service.</p><div className="border border-[#E4DAC9] bg-[#FDFAF4] p-4"><p className="font-semibold">{reservation.name}</p><p className="mt-1 text-sm text-[#756D62]">{formatDateOnly(reservation.date)} at {reservation.time} | {reservation.guests} guests</p></div><div className="flex flex-col-reverse gap-2 border-t border-[#E4DAC9] pt-4 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onCancel} disabled={busy}>Keep reservation</Button><Button variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <XCircle className="size-4" />}{busy ? "Cancelling..." : "Cancel reservation"}</Button></div></div></Modal>
}

function DeleteReservationModal({ busy, onCancel, onConfirm, reservation }) {
  return <Modal title="Delete reservation?" onClose={onCancel} locked={busy} layer="z-[60]"><div className="space-y-5 p-5"><p className="text-sm text-[#756D62]">This permanently deletes the reservation and cannot be undone.</p><div><p className="font-semibold">{reservation.name}</p><p className="mt-1 text-sm text-[#756D62]">{formatDateOnly(reservation.date)} at {reservation.time} | {reservation.guests} guests</p></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{busy ? "Deleting..." : "Delete reservation"}</Button></div></div></Modal>
}

function Modal({ children, layer = "z-50", locked, onClose, title }) {
  const dialogRef = useRef(null)
  useModalDialog({ open: true, containerRef: dialogRef, onEscape: locked ? undefined : onClose })

  return <div ref={dialogRef} tabIndex={-1} className={`fixed inset-0 ${layer} flex items-center justify-center bg-[#2B2B2B]/55 p-4 backdrop-blur-sm`} role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[calc(100svh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#E4DAC9] bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#E4DAC9] px-5 py-4"><h2 className="font-display text-xl font-semibold">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} disabled={locked} aria-label={`Close ${title}`}><X className="size-4" /></Button></div>{children}</div></div>
}
function EditField({ children, label }) { return <label className="block"><span className="text-xs font-semibold uppercase text-[#756D62]">{label}</span><span className="mt-1 block">{children}</span></label> }
function MetricCard({ detail, icon: Icon, label, value }) { return <Card className="border-[#E4DAC9] bg-white"><CardHeader className="flex-row items-start justify-between pb-2"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 font-sans text-3xl font-semibold leading-none tabular-nums">{value}</CardTitle></div><div className="flex size-10 items-center justify-center rounded-md bg-[#F6F1E8] text-[#8B1E1E]"><Icon className="size-5" /></div></CardHeader><CardContent><p className="text-sm text-[#756D62]">{detail}</p></CardContent></Card> }
function PageButton({ disabled, icon: Icon, label, onClick }) { return <Button variant="outline" size="icon" onClick={onClick} disabled={disabled} aria-label={label}><Icon className="size-4" /></Button> }
function Info({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-[#756D62]">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div> }
function EmptyState({ datePreset }) { return <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center"><CalendarCheck className="size-8 text-[#8B1E1E]" /><p className="mt-3 font-semibold">No reservations found.</p><p className="mt-1 text-sm text-[#756D62]">{datePreset === "today" ? "There are no matching bookings for today." : "Try another date or adjust the current filters."}</p></div> }
function sanitizePhone(value) { return value.replace(/[^\d+\s().-]/g, "").replace(/(?!^)\+/g, "") }
function formatStatus(value) { return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ") }
function formatFilterDate(value) { const [year, month, day] = String(value || "").split("-"); return year && month && day ? `${day}/${month}/${year}` : "DD/MM/YYYY" }
function formatDateOnly(value) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`)) }
function formatDateTime(value) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) }
function formatShortDate(value) { return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(value)) }

function buildCalendarDays(monthValue) {
  const [year, month] = monthValue.split("-").map(Number)
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leadingDays = (firstDay + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const result = Array.from({ length: leadingDays }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    result.push({ day, iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` })
  }
  return result
}

function shiftCalendarMonth(value, amount) {
  const [year, month] = value.split("-").map(Number)
  const next = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`
}

function formatCalendarMonth(value) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}-01T12:00:00.000Z`))
}

function getCyprusDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Nicosia", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date())
  const read = (type) => parts.find((part) => part.type === type)?.value
  return `${read("year")}-${read("month")}-${read("day")}`
}

function addIsoDays(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDateFilter(preset, customDate) {
  const today = getCyprusDateString()
  if (preset === "all") return { from: "", to: "" }
  if (preset === "tomorrow") {
    const tomorrow = addIsoDays(today, 1)
    return { from: tomorrow, to: tomorrow }
  }
  if (preset === "next7") return { from: today, to: addIsoDays(today, 6) }
  if (preset === "custom" && customDate) return { from: customDate, to: customDate }
  return { from: today, to: today }
}

function groupReservationsByDate(reservations) {
  const groups = []
  for (const reservation of reservations) {
    const current = groups.at(-1)
    if (current?.date === reservation.date) current.reservations.push(reservation)
    else groups.push({ date: reservation.date, reservations: [reservation] })
  }
  return groups
}

function formatReservationDay(value) {
  const today = getCyprusDateString()
  if (value === today) return "Today"
  if (value === addIsoDays(today, 1)) return "Tomorrow"
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`))
}
