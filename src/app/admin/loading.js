import AdminShell from "@/app/admin/_components/AdminShell"
import { TableSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Card } from "@/components/ui/card"

export default function AdminLoading() {
  return (
    <AdminShell active="overview" eyebrow="Loading" title="Admin" description="Preparing dashboard data...">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-32 animate-pulse border-[#E4DAC9] bg-white" />
          ))}
        </div>
        <TableSkeleton rows={5} columns={7} />
      </div>
    </AdminShell>
  )
}
