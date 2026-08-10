'use client'

import { Play, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function SpecialVideoCard({ special, index, highlightLabel = null }) {
  const videoRef = useRef(null)
  const previewTimeRef = useRef(0.08)
  const [started, setStarted] = useState(false)
  const [orientation, setOrientation] = useState('unknown')
  const [previewReady, setPreviewReady] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    function pauseWhenAnotherStarts(event) {
      if (event.detail !== special.id) videoRef.current?.pause()
    }

    window.addEventListener('special-video-play', pauseWhenAnotherStarts)
    return () => window.removeEventListener('special-video-play', pauseWhenAnotherStarts)
  }, [special.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (video.videoWidth && video.videoHeight) {
      setOrientation(video.videoWidth / video.videoHeight < 0.9 ? 'portrait' : 'landscape')
    }

    if (Number.isFinite(video.duration)) {
      previewTimeRef.current = Math.min(Math.max(video.duration * 0.03, 0.08), 0.5)
    }

    if (video.readyState >= 1 && Math.abs(video.currentTime - previewTimeRef.current) > 0.02) {
      video.currentTime = previewTimeRef.current
    }

    if (video.readyState >= 2 && !video.seeking) setPreviewReady(true)

    const fallback = window.setTimeout(() => {
      if (video.readyState >= 2) setPreviewReady(true)
    }, 600)

    return () => window.clearTimeout(fallback)
  }, [special.videoUrl])

  function handleMetadata(event) {
    const video = event.currentTarget
    const ratio = video.videoWidth / video.videoHeight

    setOrientation(ratio < 0.9 ? 'portrait' : 'landscape')
    previewTimeRef.current = Number.isFinite(video.duration)
      ? Math.min(Math.max(video.duration * 0.03, 0.08), 0.5)
      : 0.08

    if (!started) video.currentTime = previewTimeRef.current
  }

  async function handlePlay() {
    const video = videoRef.current
    if (!video || loadFailed) return

    video.controls = true
    setStarted(true)
    window.dispatchEvent(new CustomEvent('special-video-play', { detail: special.id }))

    try {
      await video.play()
    } catch {
      video.controls = false
      setStarted(false)
    }
  }

  function handleEnded() {
    const video = videoRef.current
    if (!video) return

    video.controls = false
    video.currentTime = previewTimeRef.current
    setStarted(false)
  }

  return (
    <article
      data-home-reveal="rise"
      className="group flex min-w-0 flex-col"
      style={{ '--home-reveal-delay': `${Math.min(index, 2) * 90}ms` }}
    >
      <div className={`relative isolate aspect-[4/3] overflow-hidden rounded-md border border-white/10 bg-[#302823] transition-shadow duration-300 sm:aspect-video ${highlightLabel ? 'shadow-[0_18px_50px_rgba(0,0,0,0.32)]' : ''}`}>
        {!previewReady && !loadFailed ? (
          <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden="true" />
        ) : null}

        <video
          ref={videoRef}
          src={special.videoUrl}
          controls={started}
          playsInline
          preload="metadata"
          onLoadedMetadata={handleMetadata}
          onLoadedData={(event) => { if (!event.currentTarget.seeking) setPreviewReady(true) }}
          onSeeked={() => setPreviewReady(true)}
          onEnded={handleEnded}
          onError={() => setLoadFailed(true)}
          aria-label={special.title}
          className={`size-full transition-opacity duration-300 ${previewReady ? 'opacity-100' : 'opacity-0'} ${orientation === 'landscape' ? 'object-cover' : 'object-contain'}`}
        >
          Your browser does not support HTML video.
        </video>

        {!started && !loadFailed ? (
          <button
            type="button"
            onClick={handlePlay}
            aria-label={`Play ${special.title}`}
            className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/15 transition-colors hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4A017]"
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-white/60 bg-black/55 text-white shadow-lg transition-transform duration-300 group-hover:scale-105 sm:size-16">
              <Play className="ml-1 size-6 fill-current sm:size-7" aria-hidden="true" />
            </span>
          </button>
        ) : null}

        {!started ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-4 flex flex-col font-display text-xl font-bold leading-none text-white sm:left-5 sm:top-5"
          >
            {String(index + 1).padStart(2, '0')}
            <span className="mt-1.5 h-0.5 w-5 bg-[#D4A017]" />
          </span>
        ) : null}

        {!started && highlightLabel ? (
          <span className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-[#E2B735]/70 bg-[#9E2020] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(139,30,30,0.45)] sm:right-4 sm:top-4">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#F4C542] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#F4C542]" />
            </span>
            <Sparkles className="size-3" aria-hidden="true" />
            {highlightLabel}
          </span>
        ) : null}

        {loadFailed ? (
          <div className="absolute inset-0 flex items-center justify-center px-5 text-center text-sm text-white/60">
            Video preview is unavailable.
          </div>
        ) : null}
      </div>

      <div className="pb-1 pt-4">
        <h3 className="mb-1.5 font-display text-xl font-bold leading-snug text-white transition-colors duration-200 group-hover:text-[#D4A017]">
          {special.title}
        </h3>
        {special.description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-white/45">
            {special.description}
          </p>
        ) : null}
      </div>
    </article>
  )
}
