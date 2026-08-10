"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { CalendarCheck, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Pencil, RefreshCw, Search, Trash2, UsersRound, Utensils, X } from "lucide-react"

import AdminShell from "@/app/admin/_components/AdminShell"
import AdminToast from "@/app/admin/_components/AdminToast"
import { MetricGridSkeleton, ResponsiveListSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { dedupeClientRequest } from "@/lib/dedupeClientRequest"
import { RESERVATION_STATUSES } from "@/lib/reservationStatus"

const statusVariant = { PENDING: "warning", CONFIRMED: "info", COMPLETED: "success", CANCELLED: "destructive" }
const statusRowAccent = { PENDING: "border-l-amber-400", CONFIRMED: "border-l-sky-500", COMPLETED: "border-l-emerald-500", CANCELLED: "border-l-red-500" }
const fieldClassName = "w-full rounded-md border border-[#E4DAC9] bg-white px-3 py-2 text-sm outline-none focus:border-[#8B1E1E] focus:ring-2 focus:ring-[#8B1E1E]/10"

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
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [toast, setToast] = useState(null)
  const toastIdRef = useRef(0)

  const showToast = (message, tone = "success") => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, tone })
  }

  useEffect(() => {
    const refreshNewReservations = () => {
      setLoading(true)
      setPage(1)
      setRefreshKey((key) => key + 1)
    }
    window.addEventListener("new-reservation-received", refreshNewReservations)
    return () => window.removeEventListener("new-reservation-received", refreshNewReservations)
  }, [])

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page), limit: "12" })
    if (deferredQuery) params.set("q", deferredQuery)
    if (status) params.set("status", status)
    const url = `/api/admin/reservations?${params}`
    dedupeClientRequest(url, () => {
      return fetch(url).then(readApi)
    })
      .then((payload) => { if (active) { setReservations(payload.data); setPagination(payload.pagination); setSummary(payload.summary) } })
      .catch((error) => { if (active) showToast(error.message || "Could not load reservations.", "error") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [deferredQuery, page, refreshKey, status])

  const patchStatus = async (reservation, nextStatus) => {
    setBusyId(reservation.id)
    try {
      const payload = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }).then(readApi)
      setReservations((current) => current.map((entry) => entry.id === reservation.id ? payload.data : entry))
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
    { label: "Matching bookings", value: pagination.total, detail: status || deferredQuery ? "Current filters" : "All reservations", icon: Utensils },
  ], [deferredQuery, pagination.total, status, summary])

  return (
    <AdminShell active="reservations" eyebrow="Dining room" title="Reservations" description="Review, edit, and manage table bookings." action={<Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((key) => key + 1) }} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>}>
      <AdminToast key={toast?.id} message={toast?.message} tone={toast?.tone} onDismiss={() => setToast(null)} />
      <div className="space-y-5">
        {loading ? <MetricGridSkeleton /> : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Reservation metrics">{metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</section>}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="font-display text-xl font-semibold">Reservation list</h2><p className="text-sm text-[#756D62]">{pagination.total} matching bookings</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative"><span className="sr-only">Search reservations</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#756D62]" /><input value={query} onChange={(event) => { const nextQuery = event.target.value; if (nextQuery.trim() !== deferredQuery) setLoading(true); setQuery(nextQuery); setPage(1) }} className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-64" placeholder="Name, email, or phone" /></label>
              <label><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(1) }} className="h-9 w-full rounded-md border border-[#E4DAC9] bg-white px-3 text-sm outline-none focus:border-[#8B1E1E] sm:w-44"><option value="">All statuses</option>{RESERVATION_STATUSES.map((option) => <option key={option} value={option}>{formatStatus(option)}</option>)}</select></label>
            </div>
          </div>
          {loading ? <ResponsiveListSkeleton rows={6} columns={7} /> : reservations.length ? (
            <ReservationsList reservations={reservations} busyId={busyId} onDelete={setDeleting} onEdit={setSelected} onStatus={patchStatus} />
          ) : <EmptyState />}
          {pagination.totalPages > 1 ? <div className="flex items-center justify-between border-t border-[#E4DAC9] pt-4"><p className="text-sm text-[#756D62]">Page {pagination.page} of {pagination.totalPages}</p><div className="flex gap-2"><PageButton label="Previous page" disabled={loading || page <= 1} icon={ChevronLeft} onClick={() => { setLoading(true); setPage((value) => value - 1) }} /><PageButton label="Next page" disabled={loading || page >= pagination.totalPages} icon={ChevronRight} onClick={() => { setLoading(true); setPage((value) => value + 1) }} /></div></div> : null}
        </section>
      </div>
      {selected ? <ReservationModal reservation={selected} busy={busyId === selected.id} onClose={() => setSelected(null)} onSave={(changes) => saveReservation(selected, changes)} /> : null}
      {deleting ? <DeleteReservationModal reservation={deleting} busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={() => deleteReservation(deleting)} /> : null}
    </AdminShell>
  )
}

function ReservationsList({ busyId, onDelete, onEdit, onStatus, reservations }) {
  return <>
    <div className="hidden overflow-x-auto border border-[#E4DAC9] bg-white lg:block">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="border-b border-[#D8CEBD] bg-[#F6F1E8] text-[11px] font-semibold uppercase text-[#756D62]"><tr><th className="px-4 py-3">Reservation</th><th className="px-4 py-3">Guest</th><th className="px-4 py-3 text-center">Guests</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-[#D8CEBD]">{reservations.map((reservation, index) => <ReservationRow key={reservation.id} reservation={reservation} index={index} busy={busyId === reservation.id} onDelete={() => onDelete(reservation)} onEdit={() => onEdit(reservation)} onStatus={(nextStatus) => onStatus(reservation, nextStatus)} />)}</tbody>
      </table>
    </div>
    <div className="grid gap-3 lg:hidden">{reservations.map((reservation) => <ReservationMobileRow key={reservation.id} reservation={reservation} busy={busyId === reservation.id} onDelete={() => onDelete(reservation)} onEdit={() => onEdit(reservation)} onStatus={(nextStatus) => onStatus(reservation, nextStatus)} />)}</div>
  </>
}

function ReservationRow({ busy, index, onDelete, onEdit, onStatus, reservation }) {
  const rowTone = reservation.status === "PENDING"
    ? "[&>td]:bg-[#FFF0C2] hover:[&>td]:bg-[#FFE4A3]"
    : reservation.status === "CANCELLED"
      ? `${index % 2 ? "[&>td]:bg-red-50/55" : "[&>td]:bg-red-50/30"} hover:[&>td]:bg-red-100/70`
      : reservation.status === "CONFIRMED"
        ? "[&>td]:bg-sky-50/65 hover:[&>td]:bg-sky-100/70"
        : "[&>td]:bg-emerald-50/45 hover:[&>td]:bg-emerald-100/55"
  return <tr className={`${rowTone} align-middle [&>td]:transition-colors`}>
    <td className={`whitespace-nowrap border-l-4 px-4 py-4 ${statusRowAccent[reservation.status] || "border-l-[#D8CEBD]"}`}><p className="font-semibold">{formatDateOnly(reservation.date)}</p><p className="mt-1 text-sm font-bold text-[#8B1E1E]">{reservation.time}</p></td>
    <td className="px-4 py-4"><button type="button" onClick={onEdit} className="max-w-48 truncate font-semibold hover:text-[#8B1E1E] hover:underline">{reservation.name}</button><p className="mt-1 whitespace-nowrap text-xs text-[#756D62]">{reservation.phone}</p><p className="mt-0.5 max-w-48 truncate text-xs text-[#756D62]">{reservation.email}</p></td>
    <td className="px-4 py-4 text-center"><span className="inline-flex min-w-8 items-center justify-center rounded-md bg-white px-2 py-1 font-bold tabular-nums ring-1 ring-black/8">{reservation.guests}</span></td>
    <td className="px-4 py-4"><p className="max-w-56 truncate text-[#756D62]" title={reservation.requests || undefined}>{reservation.requests || "-"}</p></td>
    <td className="whitespace-nowrap px-4 py-4 text-xs text-[#756D62]">{formatDateTime(reservation.createdAt)}</td>
    <td className="whitespace-nowrap px-4 py-4"><Badge variant={statusVariant[reservation.status]}>{formatStatus(reservation.status)}</Badge></td>
    <td className="px-4 py-4"><ReservationActions reservation={reservation} busy={busy} onDelete={onDelete} onEdit={onEdit} onStatus={onStatus} compact /></td>
  </tr>
}

function ReservationMobileRow({ busy, onDelete, onEdit, onStatus, reservation }) {
  const background = reservation.status === "PENDING"
    ? "border-[#D4A017] bg-[#FFF0C2] shadow-[inset_4px_0_0_#B7791F]"
    : reservation.status === "CANCELLED"
      ? "border-red-200 bg-red-50/35"
      : reservation.status === "CONFIRMED"
        ? "border-sky-200 bg-sky-50/65 shadow-[inset_4px_0_0_#0EA5E9]"
        : "border-emerald-200 bg-emerald-50/45 shadow-[inset_4px_0_0_#10B981]"
  return <article className={`border p-4 ${background}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{reservation.name}</p><p className="mt-1 truncate text-xs text-[#756D62]">{reservation.email} | {reservation.phone}</p></div><Badge variant={statusVariant[reservation.status]}>{formatStatus(reservation.status)}</Badge></div><div className="mt-4 grid grid-cols-3 gap-3 border-y border-black/8 py-3 text-sm"><Info label="Date" value={formatDateOnly(reservation.date)} /><Info label="Time" value={reservation.time} /><Info label="Guests" value={reservation.guests} /></div>{reservation.requests ? <p className="mt-3 line-clamp-2 text-sm text-[#756D62]">{reservation.requests}</p> : null}<div className="mt-4"><ReservationActions reservation={reservation} busy={busy} onDelete={onDelete} onEdit={onEdit} onStatus={onStatus} /></div></article>
}

function ReservationActions({ busy, compact = false, onDelete, onEdit, onStatus, reservation }) {
  return <div className="flex flex-wrap items-center justify-end gap-2"><select value={reservation.status} onChange={(event) => onStatus(event.target.value)} disabled={busy} aria-label={`Status for ${reservation.name}`} className="h-9 rounded-md border border-[#E4DAC9] bg-white px-2 text-sm outline-none">{RESERVATION_STATUSES.map((option) => <option key={option} value={option}>{formatStatus(option)}</option>)}</select><Button variant="outline" size={compact ? "icon-sm" : "sm"} onClick={onEdit} aria-label={`Edit reservation for ${reservation.name}`} title="Edit reservation"><Pencil className="size-4" />{compact ? null : "Edit"}</Button><Button variant="destructive" size="icon-sm" onClick={onDelete} disabled={busy} aria-label={`Delete reservation for ${reservation.name}`} title="Delete reservation"><Trash2 className="size-4" /></Button></div>
}

function ReservationModal({ busy, onClose, onSave, reservation }) {
  const [form, setForm] = useState({ name: reservation.name, email: reservation.email, phone: reservation.phone, guests: String(reservation.guests), date: reservation.date, time: reservation.time, status: reservation.status, requests: reservation.requests, internalNote: reservation.internalNote })
  const [error, setError] = useState("")
  const update = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setError("") }
  const save = async (event) => { event.preventDefault(); setError(""); try { await onSave(form) } catch (saveError) { setError(saveError.message || "Could not save reservation.") } }
  return <Modal title="Edit reservation" onClose={onClose} locked={busy}><form className="space-y-5 p-5" onSubmit={save}><p className="text-sm font-semibold">{reservation.name} <span className="font-normal text-[#756D62]">| Received {formatDateTime(reservation.createdAt)}</span></p><div className="grid gap-4 sm:grid-cols-2"><EditField label="Guest name"><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => update("name", event.target.value)} className={fieldClassName} /></EditField><EditField label="Email"><input required type="email" maxLength={254} value={form.email} onChange={(event) => update("email", event.target.value)} className={fieldClassName} /></EditField><EditField label="Phone"><input required type="tel" maxLength={30} value={form.phone} onChange={(event) => update("phone", sanitizePhone(event.target.value))} className={fieldClassName} /></EditField><EditField label="Guests"><input required type="number" min="1" max="20" value={form.guests} onChange={(event) => update("guests", event.target.value)} className={fieldClassName} /></EditField><EditField label="Date"><input required type="date" value={form.date} onChange={(event) => update("date", event.target.value)} className={fieldClassName} /></EditField><EditField label="Time"><input required type="time" value={form.time} onChange={(event) => update("time", event.target.value)} className={fieldClassName} /></EditField></div><EditField label="Status"><select value={form.status} onChange={(event) => update("status", event.target.value)} className={fieldClassName}>{RESERVATION_STATUSES.map((option) => <option key={option} value={option}>{formatStatus(option)}</option>)}</select></EditField><EditField label="Special requests"><textarea value={form.requests} onChange={(event) => update("requests", event.target.value)} maxLength={1000} rows={3} className={fieldClassName} /></EditField><EditField label="Internal note"><textarea value={form.internalNote} onChange={(event) => update("internalNote", event.target.value)} maxLength={2000} rows={4} className={fieldClassName} placeholder="Visible to admin only" /></EditField>{error ? <p className="bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p> : null}<div className="flex justify-end gap-2 border-t border-[#E4DAC9] pt-4"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />}{busy ? "Saving..." : "Save changes"}</Button></div></form></Modal>
}

function DeleteReservationModal({ busy, onCancel, onConfirm, reservation }) {
  return <Modal title="Delete reservation?" onClose={onCancel} locked={busy} layer="z-[60]"><div className="space-y-5 p-5"><p className="text-sm text-[#756D62]">This permanently deletes the reservation and cannot be undone.</p><div><p className="font-semibold">{reservation.name}</p><p className="mt-1 text-sm text-[#756D62]">{formatDateOnly(reservation.date)} at {reservation.time} | {reservation.guests} guests</p></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant="destructive" onClick={onConfirm} disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{busy ? "Deleting..." : "Delete reservation"}</Button></div></div></Modal>
}

function Modal({ children, layer = "z-50", locked, onClose, title }) { return <div className={`fixed inset-0 ${layer} flex items-center justify-center bg-[#2B2B2B]/55 p-4 backdrop-blur-sm`} role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[calc(100svh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#E4DAC9] bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#E4DAC9] px-5 py-4"><h2 className="font-display text-xl font-semibold">{title}</h2><Button variant="ghost" size="icon" onClick={onClose} disabled={locked} aria-label={`Close ${title}`}><X className="size-4" /></Button></div>{children}</div></div> }
function EditField({ children, label }) { return <label className="block"><span className="text-xs font-semibold uppercase text-[#756D62]">{label}</span><span className="mt-1 block">{children}</span></label> }
function MetricCard({ detail, icon: Icon, label, value }) { return <Card className="border-[#E4DAC9] bg-white"><CardHeader className="flex-row items-start justify-between pb-2"><div><CardDescription>{label}</CardDescription><CardTitle className="mt-2 font-sans text-3xl font-semibold leading-none tabular-nums">{value}</CardTitle></div><div className="flex size-10 items-center justify-center rounded-md bg-[#F6F1E8] text-[#8B1E1E]"><Icon className="size-5" /></div></CardHeader><CardContent><p className="text-sm text-[#756D62]">{detail}</p></CardContent></Card> }
function PageButton({ disabled, icon: Icon, label, onClick }) { return <Button variant="outline" size="icon" onClick={onClick} disabled={disabled} aria-label={label}><Icon className="size-4" /></Button> }
function Info({ label, value }) { return <div><p className="text-xs font-semibold uppercase text-[#756D62]">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div> }
function EmptyState() { return <div className="flex min-h-52 flex-col items-center justify-center border border-dashed border-[#E4DAC9] bg-[#FDFAF4] p-6 text-center"><CalendarCheck className="size-8 text-[#8B1E1E]" /><p className="mt-3 font-semibold">No reservations found.</p></div> }
function sanitizePhone(value) { return value.replace(/[^\d+\s().-]/g, "").replace(/(?!^)\+/g, "") }
function formatStatus(value) { return value.split("_").map((part) => part.charAt(0) + part.slice(1).toLowerCase()).join(" ") }
function formatDateOnly(value) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`)) }
function formatDateTime(value) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) }
