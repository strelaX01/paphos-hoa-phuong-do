'use client'

import { Search, X } from 'lucide-react'

export default function MenuSearchField({ onChange, placeholder = 'Search dishes or categories', value }) {
  return (
    <div className="relative min-w-0">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8b6f47]" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            onChange('')
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full appearance-none border border-[#ded2bf] bg-white/85 pl-10 pr-11 text-base text-[#2b241e] outline-none transition-colors placeholder:text-[#9a9085] focus:border-[#9d2023] focus:ring-2 focus:ring-[#9d2023]/10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-0 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center text-[#81766b] transition-colors hover:bg-[#f2eadf] hover:text-[#9d2023] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a017]"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
