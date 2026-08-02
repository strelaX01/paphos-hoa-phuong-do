import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import GalleryGridClient from '@/app/gallery/GalleryGridClient'

export default function GalleryPreview({ images = [] }) {
  if (!images.length) return null

  const previewImages = images.slice(0, 6)

  return (
    <section id="gallery-preview" aria-label="Gallery preview" className="bg-[#F8F3EA] py-20 lg:py-28">
      <div className="site-container">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.3em] text-[#D4A017]">Gallery</span>
            <h2 className="font-display text-3xl font-bold leading-[1.1] text-[#2B2B2B] sm:text-4xl lg:text-[44px]">Moments &amp; Flavours</h2>
          </div>
          <Link id="view-gallery-btn" href="/gallery" className="group inline-flex items-center gap-2 self-start border-b border-[#2B2B2B]/25 pb-0.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#2B2B2B] transition-colors hover:border-[#8B1E1E] hover:text-[#8B1E1E] sm:self-end">
            View Full Gallery
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <GalleryGridClient items={previewImages} layout="preview" paginate={false} />
      </div>
    </section>
  )
}
