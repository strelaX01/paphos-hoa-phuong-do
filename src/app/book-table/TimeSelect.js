'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'

export default function TimeSelect({ disabled = false, name, onChange, options, placeholder = 'Select', required, value }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className="flex h-12 w-full items-center border border-[#E8DFC8] bg-white/70 px-3 text-[14px] text-[#2B2B2B] outline-none transition-all focus:border-[#D4A017] focus:ring-2 focus:ring-[#D4A017]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Clock className="size-4 shrink-0 text-[#8B1E1E]" aria-hidden="true" />
        <span className={`ml-3 flex-1 text-left ${value ? 'text-[#2B2B2B]' : 'text-[#9C9489]'}`}>
          {value || placeholder}
        </span>
        <svg className={`size-4 text-[#9C9489] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto border border-[#E8DFC8] bg-white shadow-lg">
          {options.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => { onChange(time); setOpen(false) }}
              className={`block w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#FAF6EE] ${
                value === time ? 'bg-[#FAF6EE] font-semibold text-[#8B1E1E]' : 'text-[#2B2B2B]'
              }`}
            >
              {time}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
