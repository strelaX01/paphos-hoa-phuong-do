export function CardGridSkeleton({ count = 6, dark = false, image = true }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`animate-pulse overflow-hidden border ${
            dark ? 'border-white/10 bg-white/[0.03]' : 'border-[#E8DFC8] bg-white/65'
          }`}
        >
          {image && <div className={dark ? 'h-36 bg-white/10' : 'h-36 bg-[#E8DFC8]'} />}
          <div className="space-y-3 p-4">
            <div className={`h-4 w-2/3 ${dark ? 'bg-white/15' : 'bg-[#E8DFC8]'}`} />
            <div className={`h-3 w-1/2 ${dark ? 'bg-white/10' : 'bg-[#EFE7D8]'}`} />
            <div className={`h-3 w-full ${dark ? 'bg-white/10' : 'bg-[#EFE7D8]'}`} />
            <div className={`h-3 w-4/5 ${dark ? 'bg-white/10' : 'bg-[#EFE7D8]'}`} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 7 }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8DFC8] bg-white shadow-sm" aria-hidden="true">
      <div className="grid gap-3 border-b border-[#E8DFC8] bg-[#F8F3EA] p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(110px, 1fr))` }}>
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} className="h-3 animate-pulse rounded bg-[#E8DFC8]" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="grid gap-3 border-b border-[#F0E8D8] p-4 last:border-b-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(110px, 1fr))` }}>
          {Array.from({ length: columns }, (_, index) => (
            <div key={index} className="h-4 animate-pulse rounded bg-[#EFE7D8]" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function PageShellSkeleton() {
  return (
    <main className="min-h-screen bg-[#F8F3EA]">
      <section className="relative min-h-[58svh] overflow-hidden bg-[#1E1A18]">
        <div className="site-container flex min-h-[58svh] items-center pt-24">
          <div className="w-full max-w-2xl animate-pulse py-20">
            <div className="mb-5 h-3 w-48 bg-[#D4A017]/35" />
            <div className="h-14 w-4/5 bg-white/15 sm:h-20" />
            <div className="mt-4 h-14 w-3/5 bg-white/10 sm:h-20" />
            <div className="mt-7 h-4 w-2/3 bg-white/10" />
            <div className="mt-3 h-4 w-1/2 bg-white/10" />
          </div>
        </div>
      </section>
      <section className="py-16 lg:py-24">
        <div className="site-container">
          <CardGridSkeleton count={6} />
        </div>
      </section>
    </main>
  )
}
