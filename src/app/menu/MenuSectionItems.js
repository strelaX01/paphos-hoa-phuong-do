'use client'

import { useState } from 'react'
import Image from 'next/image'
import PaginationControls from '@/app/components/shared/PaginationControls'
import SpicyDishMark from '@/app/components/shared/SpicyDishMark'
import MenuAddToCart from './MenuAddToCart'

const ITEMS_PER_PAGE = 6

export default function MenuSectionItems({ items, showCategory = false }) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  const pageItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function handlePageChange(nextPage) {
    setPage(nextPage)
    // No scroll — user stays in section context
  }

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-3 lg:gap-7">
        {pageItems.map((item) => (
          <MenuItemCard key={`${item.id}`} item={item} showCategory={showCategory} />
        ))}
      </div>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        className="mt-8"
      />
    </>
  )
}

function MenuItemCard({ item, showCategory }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasRemoteImage = Boolean(item.image) && !imageFailed

  return (
    <article className={`group overflow-hidden border border-[#E8DFC8] bg-[#FAF6EE] transition-all duration-300 hover:border-[#D4A017]/60 ${item.isSpicy ? 'spicy-menu-card' : ''}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E8DFC8]">
        <Image
          src={hasRemoteImage ? item.image : '/images/hoa-phuong-do-logo.png'}
          alt={hasRemoteImage ? `${item.name} at Hoa Phuong Do` : 'Hoa Phuong Do restaurant logo'}
          fill
          unoptimized={hasRemoteImage}
          onError={() => setImageFailed(true)}
          className={hasRemoteImage ? 'object-cover transition-transform duration-500 group-hover:scale-[1.05]' : 'object-contain p-12'}
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
        {hasRemoteImage ? <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" /> : null}
        {item.isSpicy ? <SpicyDishMark className="absolute left-0 top-0" /> : null}
        <span
          className="absolute bottom-4 right-4 inline-flex items-center justify-center bg-[#D4A017] px-3.5 rounded-full font-sans font-bold tabular-nums text-[#1A1410] text-[13px]"
          style={{ height: '28px', lineHeight: 1 }}
        >
          {item.price}
        </span>
      </div>

      <div className="p-5">
        {showCategory && item.searchCategory ? <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9d2023]">{item.searchCategory}</p> : null}
        <h3 className="font-display text-2xl font-bold leading-tight text-[#2B2B2B] mb-3">
          {item.name}
        </h3>
        {item.nameEn && item.nameEn !== item.name ? <p className="-mt-2 mb-3 text-xs font-medium uppercase text-[#8B1E1E]">{item.nameEn}</p> : null}
        <div className="mb-4 h-px bg-[#E8DFC8]" />
        <p className="text-[13px] leading-relaxed text-[#6B6560]">
          {item.description}
        </p>
        {item.choices?.length ? (
          <p className="mt-3 border-l-2 border-[#D4A017] pl-3 text-[12px] leading-relaxed text-[#4F493F]">
            <span className="font-bold text-[#8B1E1E]">Choice:</span>{' '}
            {item.choices.join(' / ')}
          </p>
        ) : null}
        {item.deliverable && <MenuAddToCart item={item} />}
      </div>
    </article>
  )
}
