"use client"

import { Check, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"

const initialForm = { currentPassword: "", newPassword: "", confirmPassword: "" }
const initialVisibility = { currentPassword: false, newPassword: false, confirmPassword: false }

export default function ChangePasswordDialog({ compact = false, className = "", required = false }) {
  const router = useRouter()
  const currentPasswordRef = useRef(null)
  const redirectTimer = useRef(null)
  const [open, setOpen] = useState(required)
  const [visibility, setVisibility] = useState(initialVisibility)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const passwordChecks = useMemo(() => ({
    length: form.newPassword.length >= 10 && form.newPassword.length <= 128,
    letters: /[a-z]/.test(form.newPassword) && /[A-Z]/.test(form.newPassword),
    numberAndSpacing: /\d/.test(form.newPassword) && !/\s/.test(form.newPassword),
  }), [form.newPassword])
  const passwordsMatch = Boolean(form.confirmPassword) && form.newPassword === form.confirmPassword
  const canSubmit = Boolean(form.currentPassword) && passwordsMatch && Object.values(passwordChecks).every(Boolean)

  useEffect(() => () => window.clearTimeout(redirectTimer.current), [])

  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focusTimer = window.setTimeout(() => currentPasswordRef.current?.focus(), 50)
    const handleEscape = (event) => {
      if (event.key === "Escape" && !required && !submitting && !success) setOpen(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      window.clearTimeout(focusTimer)
      window.removeEventListener("keydown", handleEscape)
    }
  }, [open, required, submitting, success])

  const updateField = (field, value) => {
    setError("")
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetDialog() {
    setError("")
    setSuccess(false)
    setSubmitting(false)
    setVisibility(initialVisibility)
    setForm(initialForm)
  }

  function openDialog() {
    resetDialog()
    setOpen(true)
  }

  function closeDialog() {
    if (required || submitting || success) return
    setOpen(false)
    resetDialog()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting || !canSubmit) return
    setError("")
    setSubmitting(true)

    try {
      const response = await fetch("/api/admin/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload.error || "Could not change password.")
        return
      }

      setSuccess(true)
      redirectTimer.current = window.setTimeout(() => {
        router.replace("/admin/login")
        router.refresh()
      }, 900)
    } catch {
      setError("Unable to connect. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return <>
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon" : "default"}
      className={className}
      onClick={openDialog}
      aria-label="Change password"
      title="Change password"
    >
      <KeyRound className="size-4" />
      {compact ? null : <span>Change password</span>}
    </Button>

    {open ? createPortal(<div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#202020]/65 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}
    >
      <div className="flex max-h-[calc(100svh-1.5rem)] w-full flex-col overflow-hidden rounded-lg border border-[#E4DAC9] bg-[#FDFBF7] text-[#202020] shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:max-w-[28rem]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#E4DAC9] bg-white px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8B1E1E]">Account security</p>
            <h2 id="change-password-title" className="mt-0.5 truncate font-display text-xl font-semibold">{required ? "Create your password" : "Change password"}</h2>
          </div>
          {!required ? <Button type="button" variant="ghost" size="icon" onClick={closeDialog} disabled={submitting || success} aria-label="Close change password">
            <X className="size-4" />
          </Button> : null}
        </div>

        {success ? <div className="flex min-h-64 flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-5" /></div>
          <p className="mt-4 font-semibold">Password changed successfully</p>
          <p className="mt-1 text-sm text-[#756D62]">Signing you out securely...</p>
        </div> : <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
            {required ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">The temporary password can only be used to create your own password.</p> : null}
            <PasswordField
              ref={currentPasswordRef}
              id="current-password"
              label="Current password"
              value={form.currentPassword}
              onChange={(value) => updateField("currentPassword", value)}
              visible={visibility.currentPassword}
              onToggle={() => setVisibility((current) => ({ ...current, currentPassword: !current.currentPassword }))}
              autoComplete="current-password"
              maxLength={256}
            />

            <PasswordField
              id="new-password"
              label="New password"
              value={form.newPassword}
              onChange={(value) => updateField("newPassword", value)}
              visible={visibility.newPassword}
              onToggle={() => setVisibility((current) => ({ ...current, newPassword: !current.newPassword }))}
              autoComplete="new-password"
            />

            <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
              <Requirement met={passwordChecks.length}>10-128 characters</Requirement>
              <Requirement met={passwordChecks.letters}>Upper and lowercase</Requirement>
              <Requirement met={passwordChecks.numberAndSpacing}>Number, no spaces</Requirement>
            </div>

            <div>
              <PasswordField
                id="confirm-password"
                label="Confirm new password"
                value={form.confirmPassword}
                onChange={(value) => updateField("confirmPassword", value)}
                visible={visibility.confirmPassword}
                onToggle={() => setVisibility((current) => ({ ...current, confirmPassword: !current.confirmPassword }))}
                autoComplete="new-password"
                invalid={Boolean(form.confirmPassword) && !passwordsMatch}
              />
              {form.confirmPassword && !passwordsMatch ? <p className="mt-1.5 text-xs font-medium text-red-700">Passwords do not match.</p> : null}
            </div>

            {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" aria-live="polite">{error}</div> : null}
          </div>

          <div className={`grid shrink-0 gap-2 border-t border-[#E4DAC9] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:flex sm:justify-end sm:px-5 sm:pb-4 ${required ? "grid-cols-1" : "grid-cols-2"}`}>
            {!required ? <Button type="button" variant="outline" onClick={closeDialog} disabled={submitting}>Cancel</Button> : null}
            <Button type="submit" disabled={submitting || !canSubmit}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              <span>{submitting ? "Changing..." : "Update password"}</span>
            </Button>
          </div>
        </form>}
      </div>
    </div>, document.body) : null}
  </>
}

function PasswordField({ autoComplete, id, invalid = false, label, maxLength = 128, onChange, onToggle, ref, value, visible }) {
  return <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B8175]" />
      <input
        ref={ref}
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        maxLength={maxLength}
        aria-invalid={invalid}
        className="h-10 w-full rounded-md border border-[#D9CDBB] bg-white pl-10 pr-11 text-sm outline-none transition focus:border-[#8B1E1E] focus:ring-3 focus:ring-[#8B1E1E]/15 aria-invalid:border-red-500 aria-invalid:ring-red-500/15"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F2EAD8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]"
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  </div>
}

function Requirement({ children, met }) {
  return <span className={`flex items-center gap-1.5 ${met ? "font-medium text-emerald-700" : "text-[#8B8175]"}`}>
    <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${met ? "border-emerald-600 bg-emerald-600 text-white" : "border-[#CFC4B3]"}`}>
      {met ? <Check className="size-2.5" strokeWidth={3} /> : null}
    </span>
    {children}
  </span>
}
