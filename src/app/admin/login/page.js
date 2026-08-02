import { redirect } from "next/navigation"

import AdminAuthCard from "@/app/admin/login/AdminAuthCard"
import LoginForm from "@/app/admin/login/LoginForm"
import { getCurrentAdminAccount } from "@/lib/adminAuth"

export const metadata = {
  title: "Admin sign in | Hoa Phuong Do",
  robots: { index: false, follow: false },
}

function getSafeNextPath(value) {
  if (typeof value !== "string") return "/admin"
  if (!value.startsWith("/admin") || value.startsWith("/admin/login") || value.startsWith("//")) {
    return "/admin"
  }
  return value
}

export default async function AdminLoginPage({ searchParams }) {
  const account = await getCurrentAdminAccount()
  if (account) redirect(account.role === "DRIVER" ? "/admin/orders" : "/admin")

  const params = await searchParams
  const nextPath = getSafeNextPath(params?.next)

  return (
    <AdminAuthCard eyebrow="Admin portal" title="Welcome back">
      <LoginForm nextPath={nextPath} />
    </AdminAuthCard>
  )
}
