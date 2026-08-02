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

export function MetricGridSkeleton({ count = 4 }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${count > 2 ? 'xl:grid-cols-4' : 'max-w-2xl'}`} role="status" aria-label="Loading summary">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-32 animate-pulse border border-[#E4DAC9] bg-white p-5">
          <div className="h-3 w-24 bg-[#E8DFC8]" />
          <div className="mt-5 h-7 w-20 bg-[#DDD3C2]" />
          <div className="mt-4 h-3 w-32 max-w-full bg-[#EFE7D8]" />
        </div>
      ))}
      <span className="sr-only">Loading summary</span>
    </div>
  )
}

export function ResponsiveListSkeleton({ columns = 7, rows = 6 }) {
  return (
    <div role="status" aria-label="Loading list">
      <div className="hidden overflow-hidden border border-[#E4DAC9] bg-white lg:block">
        <div
          className="grid gap-4 border-b border-[#E4DAC9] bg-[#F6F1E8] px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, index) => <div key={index} className="h-3 animate-pulse bg-[#DDD3C2]" />)}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="grid min-h-20 items-center gap-4 border-b border-[#E4DAC9] px-4 py-4 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, column) => (
              <div key={column} className="space-y-2 animate-pulse">
                <div className={`h-3 bg-[#E8DFC8] ${column % 3 === 0 ? 'w-4/5' : 'w-full'}`} />
                {column < 3 ? <div className="h-2.5 w-2/3 bg-[#F0E8DA]" /> : null}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: Math.min(rows, 5) }, (_, index) => (
          <div key={index} className="animate-pulse border border-[#E4DAC9] bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="w-3/5 space-y-2"><div className="h-4 w-4/5 bg-[#E8DFC8]" /><div className="h-3 w-full bg-[#F0E8DA]" /></div>
              <div className="h-6 w-20 bg-[#E8DFC8]" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 border-y border-[#EFE7D8] py-3">
              {Array.from({ length: 3 }, (_, cell) => <div key={cell} className="h-8 bg-[#F0E8DA]" />)}
            </div>
            <div className="mt-4 ml-auto h-9 w-40 max-w-full bg-[#E8DFC8]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading list</span>
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading settings">
      <SkeletonFormSection fields={4} />
      <SkeletonFormSection fields={2} />
      <div className="animate-pulse border border-[#E4DAC9] bg-white p-5 sm:p-6">
        <div className="h-5 w-36 bg-[#DDD3C2]" />
        <div className="mt-3 h-3 w-72 max-w-full bg-[#EFE7D8]" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid gap-3 border border-[#EFE7D8] p-3 sm:grid-cols-[minmax(9rem,1fr)_8rem_8rem_4rem]">
              <div className="h-10 bg-[#E8DFC8]" />
              <div className="h-10 bg-[#F0E8DA]" />
              <div className="h-10 bg-[#F0E8DA]" />
              <div className="h-10 bg-[#F0E8DA]" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading settings</span>
    </div>
  )
}

function SkeletonFormSection({ fields }) {
  return (
    <div className="animate-pulse border border-[#E4DAC9] bg-white p-5 sm:p-6">
      <div className="h-5 w-44 bg-[#DDD3C2]" />
      <div className="mt-3 h-3 w-80 max-w-full bg-[#EFE7D8]" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className={index === fields - 1 && fields > 2 ? 'sm:col-span-2' : ''}>
            <div className="mb-2 h-3 w-24 bg-[#E8DFC8]" />
            <div className="h-10 bg-[#F0E8DA]" />
          </div>
        ))}
      </div>
    </div>
  )
}
