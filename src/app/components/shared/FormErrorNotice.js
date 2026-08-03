'use client'

import { CircleAlert, X } from 'lucide-react'

export default function FormErrorNotice({ message, onDismiss, title = 'Could not submit' }) {
  if (!message) return null

  return (
    <>
      <div role="alert" className="hidden items-start gap-3 border border-[#8B1E1E]/25 bg-[#8B1E1E]/10 px-4 py-3 text-[#8B1E1E] sm:flex">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed">{message}</p>
        </div>
      </div>

      <div
        role="alert"
        aria-label={title}
        className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[110] border border-[#D9A09A] bg-[#FFF8F6] p-4 text-[#6F1717] shadow-2xl shadow-black/25 sm:hidden"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center bg-[#8B1E1E] text-white">
            <CircleAlert className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#7C3A35]">{message}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex size-11 shrink-0 items-center justify-center text-[#6F1717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E]"
            aria-label="Dismiss error message"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  )
}
