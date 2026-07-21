import { AdminNotificationsProvider } from "@/app/admin/_components/AdminNotifications"
import { AdminSessionProvider } from "@/app/admin/_components/AdminSession"
import { getCurrentAdminAccount } from "@/lib/adminAuth"

export default async function AdminLayout({ children }) {
  const account = await getCurrentAdminAccount()

  if (!account) {
    return <div className="min-h-screen bg-[#F2EAD8]">{children}</div>
  }

  return (
    <AdminSessionProvider account={account}>
      <AdminNotificationsProvider role={account.role}>
        <div className="min-h-screen bg-[#F2EAD8]">{children}</div>
      </AdminNotificationsProvider>
    </AdminSessionProvider>
  )
}
