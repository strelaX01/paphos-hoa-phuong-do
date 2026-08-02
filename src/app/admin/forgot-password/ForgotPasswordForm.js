"use client"

import { ArrowLeft, CheckCircle2, LoaderCircle, Mail } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { getRecoveryEmailError, RECOVERY_EMAIL_MAX_LENGTH } from "@/lib/adminRecoveryValidation"

function getRateLimitMessage(response) {
  const retryAfter = Number(response.headers.get("Retry-After"))
  if (!Number.isFinite(retryAfter) || retryAfter <= 0) {
    return "Too many reset requests. Please try again later."
  }
  if (retryAfter >= 60 * 60) {
    const hours = Math.ceil(retryAfter / (60 * 60))
    return `Too many reset requests. Try again in about ${hours} ${hours === 1 ? "hour" : "hours"}.`
  }
  const minutes = Math.max(1, Math.ceil(retryAfter / 60))
  return `Too many reset requests. Try again in about ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [emailTouched, setEmailTouched] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    const validationError = getRecoveryEmailError(email)
    setEmailTouched(true)
    setEmailError(validationError || "")
    if (validationError) return

    setError("")
    setMessage("")
    setSubmitting(true)

    try {
      const response = await fetch("/api/admin/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(response.status === 429
          ? getRateLimitMessage(response)
          : payload.error || "Unable to request a reset link.")
        return
      }
      setMessage(payload.message || "If the account exists, a reset link has been sent.")
    } catch {
      setError("Unable to connect. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (message) {
    return (
      <div className="mt-7 text-center" aria-live="polite">
        <CheckCircle2 className="mx-auto size-10 text-emerald-700" />
        <p className="mt-4 font-semibold text-[#302C27]">Check your email</p>
        <p className="mt-2 text-sm leading-6 text-[#756D62]">{message}</p>
        <Link href="/admin/login" className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#D9CDBB] bg-white px-4 text-sm font-semibold text-[#302C27] hover:bg-[#F6F1E8]">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label htmlFor="recovery-email" className="block text-sm font-semibold text-[#302C27]">Admin email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B8175]" />
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={RECOVERY_EMAIL_MAX_LENGTH}
            autoFocus
            value={email}
            onChange={(event) => {
              const value = event.target.value
              setEmail(value)
              setError("")
              if (emailTouched) setEmailError(getRecoveryEmailError(value) || "")
            }}
            onBlur={() => {
              setEmailTouched(true)
              setEmailError(getRecoveryEmailError(email) || "")
            }}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "recovery-email-error" : undefined}
            className="h-11 w-full rounded-md border border-[#D9CDBB] bg-white pl-10 pr-3 text-sm text-[#202020] outline-none transition focus:border-[#8B1E1E] focus:ring-3 focus:ring-[#8B1E1E]/15 aria-invalid:border-[#A11919] aria-invalid:ring-[#A11919]/15"
            placeholder="admin@example.com"
          />
        </div>
        {emailError ? <p id="recovery-email-error" className="text-xs font-medium text-[#A11919]" aria-live="polite">{emailError}</p> : null}
      </div>

      <div aria-live="polite" className="min-h-5">
        {error ? <p className="text-sm font-medium text-[#A11919]">{error}</p> : null}
      </div>

      <button type="submit" disabled={submitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#8B1E1E] px-4 text-sm font-bold text-white transition hover:bg-[#741818] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#8B1E1E]/30 disabled:cursor-not-allowed disabled:opacity-65">
        {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />}
        {submitting ? "Sending..." : "Send reset link"}
      </button>

      <Link href="/admin/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-[#756D62] hover:text-[#8B1E1E]">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </form>
  )
}
