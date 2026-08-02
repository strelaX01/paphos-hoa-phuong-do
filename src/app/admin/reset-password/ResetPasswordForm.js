"use client"

import { Check, CheckCircle2, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export default function ResetPasswordForm() {
  const [token, setToken] = useState(null)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const candidate = fragment.get("token") || ""
    window.history.replaceState(null, "", window.location.pathname)
    const timer = window.setTimeout(() => {
      setToken(TOKEN_PATTERN.test(candidate) ? candidate : "")
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const checks = useMemo(() => ({
    length: password.length >= 10 && password.length <= 128,
    letters: /[a-z]/.test(password) && /[A-Z]/.test(password),
    numberAndSpacing: /\d/.test(password) && !/\s/.test(password),
  }), [password])
  const matches = Boolean(confirmation) && confirmation === password
  const canSubmit = Boolean(token) && matches && Object.values(checks).every(Boolean)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit || submitting) return
    setError("")
    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload.error || "Unable to reset the password.")
        return
      }
      setToken("")
      setPassword("")
      setConfirmation("")
      setSuccess(true)
    } catch {
      setError("Unable to connect. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (token === null) return <div className="mt-7 h-32 animate-pulse rounded-md bg-[#F2EAD8]" />
  if (success) {
    return (
      <div className="mt-7 text-center" aria-live="polite">
        <CheckCircle2 className="mx-auto size-10 text-emerald-700" />
        <p className="mt-4 font-semibold text-[#302C27]">Password reset successfully</p>
        <p className="mt-2 text-sm text-[#756D62]">All existing sessions have been signed out.</p>
        <Link href="/admin/login" className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#8B1E1E] px-5 text-sm font-bold text-white hover:bg-[#741818]">
          <KeyRound className="size-4" /> Sign in
        </Link>
      </div>
    )
  }
  if (!token) {
    return (
      <div className="mt-7 text-center" aria-live="polite">
        <X className="mx-auto size-10 text-[#A11919]" />
        <p className="mt-4 font-semibold text-[#302C27]">Invalid reset link</p>
        <p className="mt-2 text-sm text-[#756D62]">Request a new link to continue.</p>
        <Link href="/admin/forgot-password" className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-[#D9CDBB] bg-white px-4 text-sm font-semibold text-[#302C27] hover:bg-[#F6F1E8]">
          Request new link
        </Link>
      </div>
    )
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
      <PasswordInput id="new-password" label="New password" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} autoFocus />

      <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
        <Requirement met={checks.length}>10-128 characters</Requirement>
        <Requirement met={checks.letters}>Upper and lowercase</Requirement>
        <Requirement met={checks.numberAndSpacing}>Number, no spaces</Requirement>
      </div>

      <PasswordInput id="confirm-password" label="Confirm new password" value={confirmation} onChange={setConfirmation} visible={showPassword} onToggle={() => setShowPassword((current) => !current)} invalid={Boolean(confirmation) && !matches} />
      {confirmation && !matches ? <p className="text-xs font-medium text-[#A11919]">Passwords do not match.</p> : null}

      <div aria-live="polite" className="min-h-5">
        {error ? <p className="text-sm font-medium text-[#A11919]">{error}</p> : null}
      </div>

      <button type="submit" disabled={!canSubmit || submitting} className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#8B1E1E] px-4 text-sm font-bold text-white transition hover:bg-[#741818] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#8B1E1E]/30 disabled:cursor-not-allowed disabled:opacity-55">
        {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {submitting ? "Updating..." : "Reset password"}
      </button>
    </form>
  )
}

function PasswordInput({ autoFocus = false, id, invalid = false, label, onChange, onToggle, value, visible }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-[#302C27]">{label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B8175]" />
        <input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} autoFocus={autoFocus} aria-invalid={invalid} className="h-11 w-full rounded-md border border-[#D9CDBB] bg-white pl-10 pr-11 text-sm text-[#202020] outline-none transition focus:border-[#8B1E1E] focus:ring-3 focus:ring-[#8B1E1E]/15 aria-invalid:border-red-500" />
        <button type="button" onClick={onToggle} className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F2EAD8]" aria-label={visible ? "Hide passwords" : "Show passwords"} title={visible ? "Hide passwords" : "Show passwords"}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function Requirement({ children, met }) {
  const Icon = met ? Check : X
  return <span className={`flex items-center gap-1.5 ${met ? "text-emerald-700" : "text-[#8B8175]"}`}><Icon className="size-3.5" />{children}</span>
}
