'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CalendarDays, Clock3, Megaphone, X } from 'lucide-react'
import { useEffect, useRef, useSyncExternalStore } from 'react'

const noticeStyles = {
  GENERAL: { icon: Bell, label: 'Restaurant update', accent: 'bg-[#8B1E1E]' },
  PROMOTION: { icon: Megaphone, label: 'Special offer', accent: 'bg-[#2F5F3D]' },
  TEMPORARY_CLOSURE: { icon: Clock3, label: 'Service update', accent: 'bg-[#8B1E1E]' },
  HOLIDAY: { icon: CalendarDays, label: 'Holiday hours', accent: 'bg-[#8B6F47]' },
}
const emptySubscribe = () => () => {}

function subscribe(onStoreChange) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener('storefront-notice-dismissed', onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener('storefront-notice-dismissed', onStoreChange)
  }
}

export default function StorefrontNoticePopup({ notice }) {
  const pathname = usePathname()
  const closeButtonRef = useRef(null)
  const storageKey = notice ? `storefront-notice:${notice.id}:${notice.updatedAt}` : ''
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const dismissed = useSyncExternalStore(
    subscribe,
    () => Boolean(storageKey && window.localStorage.getItem(storageKey) === 'dismissed'),
    () => false,
  )
  const isPublicRoute = !pathname?.startsWith('/admin') && !pathname?.startsWith('/driver')
  const isVisible = Boolean(hydrated && notice && isPublicRoute && !dismissed)

  useEffect(() => {
    if (!isVisible) return undefined

    const previousOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') dismissNotice(storageKey)
    }

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousRootOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isVisible, storageKey])

  if (!isVisible) return null

  const style = noticeStyles[notice.type] || noticeStyles.GENERAL
  const Icon = style.icon

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1E1A18]/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="storefront-notice-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismissNotice(storageKey)
      }}
    >
      <section className="w-full max-w-lg overflow-hidden border border-[#D4A017]/30 bg-[#FAF6EE] shadow-2xl shadow-black/25">
        <div className={`h-1.5 w-full ${style.accent}`} />
        <div className="flex items-start justify-between gap-4 border-b border-[#E8DFC8] px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex size-10 shrink-0 items-center justify-center text-white ${style.accent}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">{style.label}</p>
              <p className="mt-1 text-xs font-medium capitalize text-[#6B6560]">{notice.priority.toLowerCase()} priority</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => dismissNotice(storageKey)}
            className="flex size-10 shrink-0 items-center justify-center text-[#6B6560] transition-colors hover:bg-[#F2EAD8] hover:text-[#2B2B2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
            aria-label="Close restaurant notice"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <h2 id="storefront-notice-title" className="font-display text-3xl font-bold leading-tight text-[#2B2B2B] sm:text-4xl">
            {notice.title}
          </h2>
          <p className="mt-4 whitespace-pre-line text-[14px] leading-relaxed text-[#6B6560]">
            {notice.message}
          </p>

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#E8DFC8] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => dismissNotice(storageKey)}
              className="inline-flex min-h-11 items-center justify-center border border-[#D8CEBA] px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#5F5547] transition-colors hover:bg-[#F2EAD8]"
            >
              Close
            </button>
            {notice.ctaHref && notice.ctaLabel ? (
              <Link
                href={notice.ctaHref}
                onClick={() => dismissNotice(storageKey)}
                className="inline-flex min-h-11 items-center justify-center bg-[#1E1A18] px-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#8B1E1E]"
              >
                {notice.ctaLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function dismissNotice(storageKey) {
  if (!storageKey) return
  window.localStorage.setItem(storageKey, 'dismissed')
  window.dispatchEvent(new Event('storefront-notice-dismissed'))
}
