"use client"

import { LoaderCircle, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export default function AdminLogoutButton({ compact = false, className = "" }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      await fetch("/api/admin/auth/logout", { method: "POST" })
    } finally {
      router.replace("/admin/login")
      router.refresh()
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={compact ? "icon" : "default"}
      className={className}
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Sign out"
      title="Sign out"
    >
      {isLoggingOut ? <LoaderCircle className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {compact ? null : <span>Sign out</span>}
    </Button>
  )
}
