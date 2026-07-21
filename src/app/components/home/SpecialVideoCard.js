'use client'

import { Play } from 'lucide-react'
import { useRef, useState } from 'react'

export default function SpecialVideoCard({ special, index }) {
  const videoRef = useRef(null)
  const [started, setStarted] = useState(false)
  const previewUrl = special.videoUrl.includes('#')
    ? special.videoUrl
    : `${special.videoUrl}#t=0.001`

  async function handlePlay() {
    const video = videoRef.current
    if (!video) return

    video.controls = true
    setStarted(true)

    try {
      await video.play()
    } catch {
      video.controls = false
      setStarted(false)
    }
  }

  return (
    <article className="group flex min-w-0 flex-col">
      <div className="relative aspect-video overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={previewUrl}
          controls={started}
          playsInline
          preload="metadata"
          aria-label={special.title}
          className="h-full w-full object-cover"
        >
          Your browser does not support HTML video.
        </video>

        {!started ? (
          <button
            type="button"
            onClick={handlePlay}
            aria-label={`Play ${special.title}`}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4A017]"
          >
            <span className="flex size-16 items-center justify-center rounded-full border border-white/60 bg-black/35 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 sm:size-20">
              <Play className="ml-1 size-7 fill-current sm:size-8" aria-hidden="true" />
            </span>
          </button>
        ) : null}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-4 font-display text-3xl font-bold leading-none text-white"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.75)' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
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
