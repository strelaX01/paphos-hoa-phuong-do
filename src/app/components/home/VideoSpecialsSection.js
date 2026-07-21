import SpecialVideoCard from './SpecialVideoCard'

/**
 * Chef's latest published video specials.
 * Server Component
 */
export default function VideoSpecialsSection({ videos = [] }) {
  if (!videos.length) return null

  const gridLayout = videos.length === 1
    ? 'mx-auto max-w-5xl'
    : videos.length === 2
      ? 'mx-auto max-w-6xl md:grid-cols-2'
      : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <section
      id="video-specials"
      aria-label="Chef's video specials"
      className="bg-[#1E1A18] py-20 lg:py-28"
    >
      <div className="site-container">
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between lg:mb-14">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">
              Featured Specials
            </span>
            <h2 className="font-display text-3xl font-bold leading-[1.1] text-white sm:text-4xl lg:text-[44px]">
              Chef&apos;s Recommendations
            </h2>
          </div>
          <p className="max-w-xs text-[13px] leading-relaxed text-white/35 sm:text-right">
            Short previews of our latest dishes, seasonal promotions, and chef creations.
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-6 lg:gap-8 ${gridLayout}`}>
          {videos.map((special, index) => (
            <SpecialVideoCard key={special.id} special={special} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
