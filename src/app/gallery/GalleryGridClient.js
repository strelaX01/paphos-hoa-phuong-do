'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'

import PaginationControls from '@/app/components/shared/PaginationControls'
import { CardGridSkeleton } from '@/app/components/shared/SkeletonBlocks'

const ITEMS_PER_PAGE = 6

export default function GalleryGridClient({ items }) {
  const galleryItems = items
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const totalPages = Math.max(1, Math.ceil(galleryItems.length / ITEMS_PER_PAGE))
  const pageItems = galleryItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const updatePage = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages)
    setIsLoading(true)
    setPage(safePage)
    window.setTimeout(() => setIsLoading(false), 220)
  }

  return (
    <>
      {!galleryItems.length ? (
        <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-[#D4A017]/30 px-6 text-center">
          <ImageOff className="size-8 text-[#8B1E1E]" aria-hidden="true" />
          <h3 className="mt-4 font-display text-2xl font-bold text-[#2B2B2B]">Our gallery is being updated.</h3>
          <p className="mt-2 text-sm text-[#6B6560]">Please check back soon for new restaurant moments.</p>
        </div>
      ) : isLoading ? (
        <CardGridSkeleton count={ITEMS_PER_PAGE} />
      ) : (
        <div className="grid auto-rows-[210px] grid-cols-1 gap-3 sm:grid-cols-2 lg:auto-rows-[260px] lg:grid-cols-4">
          {pageItems.map((item, index) => (
            <article
              key={item.id}
              className={`group relative overflow-hidden border border-[#E8DFC8] bg-[#E8DFC8] ${
                index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
              } ${index === 3 ? 'lg:col-span-2' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.src}
                alt={item.alt}
                className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
              />
            </article>
          ))}
        </div>
      )}

      {galleryItems.length > ITEMS_PER_PAGE ? (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={updatePage} className="mt-8" />
      ) : null}
    </>
  )
}
