"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react"

import { getCyprusDateKey } from "@/lib/cyprusTime"

export default function AdminDateFilter({ active, label = "Choose date", onChange, value }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => (value || getCyprusDateKey()).slice(0, 7))
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
    if (!open) setMonth((value || getCyprusDateKey()).slice(0, 7))
    setOpen((current) => !current)
  }

  return <div ref={rootRef} className="relative w-full sm:w-44">
    <button type="button" onClick={toggleCalendar} aria-haspopup="dialog" aria-expanded={open} className={`flex h-9 w-full items-center gap-2 rounded-md border bg-white px-3 pr-10 text-left text-sm tabular-nums outline-none transition-colors hover:border-[#D4A017] focus-visible:border-[#8B1E1E] focus-visible:ring-2 focus-visible:ring-[#8B1E1E]/10 ${active ? "border-[#8B1E1E] ring-2 ring-[#8B1E1E]/10" : "border-[#E4DAC9]"}`} aria-label={`${label}. ${value ? formatFilterDate(value) : "No date selected"}`}>
      <CalendarDays className="size-4 shrink-0 text-[#8B1E1E]" aria-hidden="true" />
      <span className={value ? "text-[#2B2B2B]" : "text-[#9B9285]"}>{formatFilterDate(value)}</span>
    </button>
    {value ? <button type="button" onClick={() => { onChange(""); setOpen(false) }} className="absolute right-1 top-1/2 z-20 flex size-7 -translate-y-1/2 items-center justify-center rounded bg-white text-[#756D62] hover:bg-[#F2EAD8] hover:text-[#8B1E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]" aria-label="Clear date filter"><X className="size-4" /></button> : null}
    {open ? <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[#D8CEBD] bg-white p-3 shadow-xl sm:left-auto sm:w-72" role="dialog" aria-label={label}>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setMonth((current) => shiftCalendarMonth(current, -1))} className="flex size-9 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#8B1E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]" aria-label="Previous month"><ChevronLeft className="size-4" /></button>
        <p className="font-semibold">{formatCalendarMonth(month)}</p>
        <button type="button" onClick={() => setMonth((current) => shiftCalendarMonth(current, 1))} className="flex size-9 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F6F1E8] hover:text-[#8B1E1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]" aria-label="Next month"><ChevronRight className="size-4" /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-[#9B9285]" aria-hidden="true">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => <span key={day} className="py-1">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">{calendarDays.map((day, index) => day ? <button key={day.iso} type="button" onClick={() => { onChange(day.iso); setOpen(false) }} aria-label={formatDateOnly(day.iso)} aria-pressed={day.iso === value} className={`flex aspect-square min-h-9 items-center justify-center rounded text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E] ${day.iso === value ? "bg-[#8B1E1E] font-semibold text-white" : day.iso === getCyprusDateKey() ? "bg-[#F6F1E8] font-semibold text-[#8B1E1E] ring-1 ring-[#D4A017]" : "text-[#2B2B2B] hover:bg-[#F6F1E8]"}`}>{day.day}</button> : <span key={`empty-${index}`} aria-hidden="true" />)}</div>
    </div> : null}
  </div>
}

function formatFilterDate(value) { const [year, month, day] = String(value || "").split("-"); return year && month && day ? `${day}/${month}/${year}` : "DD/MM/YYYY" }
function formatDateOnly(value) { return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00.000Z`)) }

function buildCalendarDays(monthValue) {
  const [year, month] = monthValue.split("-").map(Number)
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leadingDays = (firstDay + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const result = Array.from({ length: leadingDays }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) result.push({ day, iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` })
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
