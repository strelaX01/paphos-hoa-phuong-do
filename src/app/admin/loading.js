import { TableSkeleton } from "@/app/components/shared/SkeletonBlocks"
import { Card } from "@/components/ui/card"

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#2B2B2B] lg:flex">
      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-black/10 bg-[#202020] lg:fixed lg:inset-y-0 lg:block">
        <div className="border-b border-white/10 p-5">
          <div className="h-12 w-40 animate-pulse rounded-md bg-white/10" />
        </div>
        <div className="space-y-2 p-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-md bg-white/[0.07]" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-64">
        <header className="border-b border-[#E4DAC9] bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="h-3 w-36 animate-pulse rounded bg-[#8B1E1E]/15" />
          <div className="mt-3 h-8 w-56 animate-pulse rounded bg-[#2B2B2B]/10" />
          <div className="mt-2 h-4 w-44 animate-pulse rounded bg-[#756D62]/10" />
        </header>
        <main className="space-y-5 p-4 sm:p-6 lg:p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="h-32 animate-pulse border-[#E4DAC9] bg-white" />
            ))}
          </div>
          <TableSkeleton rows={5} columns={7} />
        </main>
      </div>
    </div>
  )
}
