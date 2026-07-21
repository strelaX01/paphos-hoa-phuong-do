'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, CheckCircle2, Mail, Phone, UserRound, UsersRound, X } from 'lucide-react'

import TimeSelect from './TimeSelect'
import { getOpeningHoursForDate, getReservationTimeSlots } from '@/lib/openingHours'

const initialState = {
  success: false,
  error: '',
}

export default function ReservationForm({ openingHours }) {
  const [state, setState] = useState(initialState)
  const [isPending, setIsPending] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const formRef = useRef(null)
  const now = new Date()
  const minDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const lastBookingDate = new Date(now)
  lastBookingDate.setDate(lastBookingDate.getDate() + 180)
  const maxDate = `${lastBookingDate.getFullYear()}-${String(lastBookingDate.getMonth() + 1).padStart(2, '0')}-${String(lastBookingDate.getDate()).padStart(2, '0')}`
  const selectedSchedule = useMemo(
    () => getOpeningHoursForDate(openingHours, selectedDate),
    [openingHours, selectedDate],
  )
  const timeSlots = useMemo(
    () => getReservationTimeSlots(openingHours, selectedDate),
    [openingHours, selectedDate],
  )
  const timePlaceholder = !selectedDate
    ? 'Select date first'
    : !selectedSchedule || selectedSchedule.isClosed
      ? 'Closed on this date'
      : timeSlots.length
        ? 'Select'
        : 'No times available'

  useEffect(() => {
    if (!state.success) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setState(initialState)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [state.success])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsPending(true)
    setState(initialState)

    const formData = new FormData(event.currentTarget)
    const body = Object.fromEntries(formData.entries())

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        const firstError = payload.errors ? Object.values(payload.errors)[0] : null
        throw new Error(firstError || payload.error || 'Could not send reservation request.')
      }

      setState({ success: true, error: '', reference: payload.data.reference })
      formRef.current?.reset()
      setSelectedDate('')
      setSelectedTime('')
    } catch (error) {
      setState({ success: false, error: error.message || 'Could not send reservation request.' })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state?.error && (
        <div className="border border-[#8B1E1E]/25 bg-[#8B1E1E]/10 px-4 py-3 text-[13px] font-medium text-[#8B1E1E]">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="name" icon={<UserRound className="size-4" />} placeholder="Your name" minLength={2} maxLength={100} />
        <Field label="Phone" name="phone" type="tel" icon={<Phone className="size-4" />} placeholder="+357 ..." minLength={6} maxLength={30} inputMode="tel" pattern="\+?[0-9 ()\-.]{6,30}" />
      </div>

      <Field label="Email" name="email" type="email" icon={<Mail className="size-4" />} placeholder="you@example.com" maxLength={254} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Date"
          name="date"
          type="date"
          min={minDate}
          max={maxDate}
          value={selectedDate}
          onChange={(event) => {
            setSelectedDate(event.target.value)
            setSelectedTime('')
          }}
          icon={<Calendar className="size-4" />}
        />

        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
            Time
          </span>
          <TimeSelect
            name="time"
            options={timeSlots}
            value={selectedTime}
            onChange={setSelectedTime}
            placeholder={timePlaceholder}
            disabled={!timeSlots.length}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
            Guests
          </span>
          <span className="flex items-center border border-[#E8DFC8] bg-white/70 px-3 text-[#2B2B2B] focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20">
            <UsersRound className="size-4 shrink-0 text-[#8B1E1E]" aria-hidden="true" />
            <select
              name="guests"
              required
              defaultValue="2"
              className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 16, 20].map((guests) => (
                <option key={guests} value={guests}>{guests}</option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
          Special requests
        </span>
        <textarea
          name="requests"
          rows={4}
          maxLength={1000}
          className="w-full resize-none border border-[#E8DFC8] bg-white/70 px-4 py-3 text-[14px] leading-relaxed text-[#2B2B2B] outline-none transition-all placeholder:text-[#9C9489] focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20"
          placeholder="Allergies, celebration, preferred seating..."
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center bg-[#8B1E1E] px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#a02424] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Sending Request...' : 'Reserve a Table'}
      </button>
    </form>

    {state.success ? (
      <ReservationSuccessModal
        reference={state.reference}
        onClose={() => setState(initialState)}
      />
    ) : null}
    </>
  )
}

function ReservationSuccessModal({ onClose, reference }) {
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1E1A18]/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-success-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md border border-[#D4A017]/35 bg-[#FAF6EE] shadow-2xl">
        <div className="flex justify-end p-3 pb-0">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center text-[#6B6560] transition-colors hover:bg-[#F2EAD8] hover:text-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
            aria-label="Close reservation confirmation"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 pb-7 text-center sm:px-8 sm:pb-8">
          <div className="mx-auto flex size-14 items-center justify-center bg-[#4A7C59]/12 text-[#2F5F3D]">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
            Request received
          </p>
          <h2 id="reservation-success-title" className="mt-2 font-display text-3xl font-bold text-[#2B2B2B]">
            Thank you for booking.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#6B6560]">
            Our team will contact you shortly to confirm your table.
          </p>
          <div className="mt-5 border border-[#E8DFC8] bg-white/65 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B6F47]">Reference</p>
            <p className="mt-1 font-mono text-lg font-bold text-[#8B1E1E]">#{reference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 flex w-full items-center justify-center bg-[#8B1E1E] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#A02424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ inputMode, label, max, maxLength, min, minLength, name, icon, onChange, pattern, type = 'text', placeholder = '', value }) {
  const preventInvalidPhoneCharacters = (event) => {
    if (name !== 'phone') return

    const sanitized = event.currentTarget.value
      .replace(/[^\d+\s().-]/g, '')
      .replace(/(?!^)\+/g, '')

    if (sanitized !== event.currentTarget.value) event.currentTarget.value = sanitized
  }

  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">
        {label}
      </span>
      <span className="flex items-center border border-[#E8DFC8] bg-white/70 px-3 text-[#2B2B2B] focus-within:border-[#D4A017] focus-within:ring-2 focus-within:ring-[#D4A017]/20">
        <span className="shrink-0 text-[#8B1E1E]" aria-hidden="true">
          {icon}
        </span>
        <input
          name={name}
          type={type}
          required={name !== 'requests'}
          min={min}
          max={max}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          value={value}
          onChange={onChange}
          onInput={preventInvalidPhoneCharacters}
          placeholder={placeholder}
          className="h-12 min-w-0 flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-[#9C9489]"
        />
      </span>
    </label>
  )
}
