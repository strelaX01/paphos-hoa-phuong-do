import Link from 'next/link'

export default function ServerPagination({ page, totalPages, basePath, className = '' }) {
  if (totalPages <= 1) return null

  const hrefFor = (target) => `${basePath}?page=${target}`

  return (
    <nav className={`flex flex-wrap items-center justify-center gap-3 ${className}`} aria-label="Pagination">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Page ${item}`}
            className={`flex size-11 items-center justify-center rounded-lg border text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] ${
              item === page
                ? 'border-[#8B1E1E] bg-[#8B1E1E] text-white'
                : 'border-[#E8DFC8] bg-white text-[#6B6560] hover:border-[#D4A017]/70 hover:text-[#8B1E1E]'
            }`}
          >
            {item}
          </Link>
        ))}
      </div>
    </nav>
  )
}
