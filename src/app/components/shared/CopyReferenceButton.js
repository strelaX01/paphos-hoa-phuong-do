'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function CopyReferenceButton({ value }) {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef(null)

  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
  }, [])

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copyReference}
      className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#D4A017]/45 bg-[#FAF6EE] px-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8B1E1E] transition-colors hover:border-[#D4A017] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
      aria-label={copied ? 'Reference copied' : 'Copy reference'}
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
