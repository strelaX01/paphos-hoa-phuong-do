import AdminAuthCard from "@/app/admin/login/AdminAuthCard"
import ResetPasswordForm from "@/app/admin/reset-password/ResetPasswordForm"

export const metadata = {
  title: "Reset admin password | Hoa Phuong Do",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
}

export default function ResetPasswordPage() {
  return (
    <AdminAuthCard
      eyebrow="Account security"
      title="Create new password"
      description="This secure link can only be used once."
    >
      <ResetPasswordForm />
    </AdminAuthCard>
  )
}
