import { redirect } from "next/navigation"

import ForgotPasswordForm from "@/app/admin/forgot-password/ForgotPasswordForm"
import AdminAuthCard from "@/app/admin/login/AdminAuthCard"
import { getCurrentAdminAccount } from "@/lib/adminAuth"

export const metadata = {
  title: "Recover admin password",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default async function ForgotPasswordPage() {
  const account = await getCurrentAdminAccount()
  if (account) redirect(account.role === "DRIVER" ? "/admin/orders" : "/admin")

  return (
    <AdminAuthCard
      eyebrow="Account recovery"
      title="Forgot password"
      description="We will send a secure reset link to the admin email."
    >
      <ForgotPasswordForm />
    </AdminAuthCard>
  )
}
