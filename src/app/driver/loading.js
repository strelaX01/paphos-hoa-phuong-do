import { CardGridSkeleton } from '@/app/components/shared/SkeletonBlocks'

export default function DriverLoading() {
  return (
    <main className="min-h-screen bg-[#F2EAD8] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 h-20 animate-pulse rounded-2xl bg-[#2B2B2B]/15" />
        <CardGridSkeleton count={3} image={false} />
      </div>
    </main>
  )
}
