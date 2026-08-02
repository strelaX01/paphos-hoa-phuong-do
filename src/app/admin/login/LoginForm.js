"use client"

import { Eye, EyeOff, LoaderCircle, LockKeyhole, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginForm({ nextPath = "/admin" }) {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    setError("")
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(payload.error || "Unable to sign in. Please try again.")
        return
      }

      router.replace(payload.redirectTo || nextPath)
      router.refresh()
    } catch {
      setError("Unable to connect. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label htmlFor="username" className="block text-sm font-semibold text-[#302C27]">Username</label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B8175]" />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_-]+"
            autoFocus
            className="h-11 w-full rounded-md border border-[#D9CDBB] bg-white pl-10 pr-3 text-sm text-[#202020] outline-none transition focus:border-[#8B1E1E] focus:ring-3 focus:ring-[#8B1E1E]/15"
            placeholder="admin"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="block text-sm font-semibold text-[#302C27]">Password</label>
          <Link href="/admin/forgot-password" className="text-xs font-semibold text-[#8B1E1E] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B8175]" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            maxLength={256}
            className="h-11 w-full rounded-md border border-[#D9CDBB] bg-white pl-10 pr-11 text-sm text-[#202020] outline-none transition focus:border-[#8B1E1E] focus:ring-3 focus:ring-[#8B1E1E]/15"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#756D62] hover:bg-[#F2EAD8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="min-h-5">
        {error ? <p className="text-sm font-medium text-[#A11919]">{error}</p> : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#8B1E1E] px-4 text-sm font-bold text-white transition hover:bg-[#741818] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#8B1E1E]/30 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  )
}
