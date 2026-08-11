'use client'



export default function PaginationControls({ page, totalPages, onPageChange, className = '' }) {
  if (totalPages <= 1) return null

  const visiblePages = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, '...', totalPages]
    if (page >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  })()

  return (
    <nav className={`flex flex-wrap items-center justify-center gap-4 ${className}`} aria-label="Pagination">

      <div className="flex flex-wrap items-center justify-center gap-2">
        {visiblePages.map((item, index) => {
          if (item === '...') {
            return (
              <span key={`ellipsis-${index}`} className="flex size-11 items-center justify-center text-[12px] font-semibold text-[#6B6560]">
                ...
              </span>
            )
          }
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item}`}
              className={`flex size-11 items-center justify-center border text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] ${
                item === page
                  ? 'border-[#8B1E1E] bg-[#8B1E1E] text-white'
                  : 'border-[#E8DFC8] bg-white/70 text-[#6B6560] hover:border-[#D4A017]/70 hover:text-[#8B1E1E]'
              }`}
            >
              {item}
            </button>
          )
        })}
      </div>

    </nav>
  )
}
