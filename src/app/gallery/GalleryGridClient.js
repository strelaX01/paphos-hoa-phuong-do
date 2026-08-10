'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react'

import GalleryImage from '@/app/components/shared/GalleryImage'
import PaginationControls from '@/app/components/shared/PaginationControls'
import { CardGridSkeleton } from '@/app/components/shared/SkeletonBlocks'

const ITEMS_PER_PAGE = 6
const GALLERY_GAP = 12

function createJustifiedRows(items, ratios, containerWidth) {
  if (!items.length || containerWidth < 640) return []

  const targetHeight = containerWidth >= 1024 ? 260 : 220
  const pendingRows = []
  let currentRow = []
  let ratioTotal = 0

  if (items.length === 6) {
    pendingRows.push(
      items.slice(0, 3).map((item, index) => ({ item, index, ratio: ratios[index] || 4 / 3 })),
      items.slice(3, 6).map((item, offset) => {
        const index = offset + 3
        return { item, index, ratio: ratios[index] || 4 / 3 }
      })
    )
  } else {
    items.forEach((item, index) => {
      const ratio = ratios[index] || 4 / 3
      currentRow.push({ item, index, ratio })
      ratioTotal += ratio

      const projectedWidth = ratioTotal * targetHeight + GALLERY_GAP * (currentRow.length - 1)
      if (projectedWidth >= containerWidth && currentRow.length >= 2) {
        pendingRows.push(currentRow)
        currentRow = []
        ratioTotal = 0
      }
    })
  }

  if (items.length !== 6 && currentRow.length === 1 && pendingRows.at(-1)?.length > 2) {
    currentRow.unshift(pendingRows.at(-1).pop())
  }
  if (items.length !== 6 && currentRow.length) pendingRows.push(currentRow)

  return pendingRows.map((row) => {
    const totalRatio = row.reduce((sum, entry) => sum + entry.ratio, 0)
    const availableWidth = containerWidth - GALLERY_GAP * (row.length - 1)
    const exactHeight = availableWidth / totalRatio
    const height = row.length === 1 ? Math.min(exactHeight, targetHeight * 1.3) : exactHeight

    return {
      entries: row,
      height,
      width: row.reduce((sum, entry) => sum + entry.ratio * height, 0) + GALLERY_GAP * (row.length - 1),
    }
  })
}

export default function GalleryGridClient({ items, paginate = true, pagination = null }) {
  const serverPaginated = Boolean(pagination)
  const [galleryItems, setGalleryItems] = useState(items)
  const [page, setPage] = useState(pagination?.page || 1)
  const [totalPages, setTotalPages] = useState(pagination?.totalPages || Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE)))
  const [pageLoading, setPageLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(null)
  const [previewRatios, setPreviewRatios] = useState(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(0)
  const touchStartRef = useRef(null)
  const previewContainerRef = useRef(null)
  const pageItems = useMemo(
    () => paginate && !serverPaginated
      ? galleryItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
      : galleryItems,
    [galleryItems, page, paginate, serverPaginated]
  )
  const activeItem = activeIndex === null ? null : pageItems[activeIndex]
  const effectiveRatios = useMemo(
    () => pageItems.map((item, index) => previewRatios?.[index] || 4 / 3),
    [pageItems, previewRatios]
  )
  const previewRows = useMemo(
    () => createJustifiedRows(pageItems, effectiveRatios, previewWidth),
    [effectiveRatios, pageItems, previewWidth]
  )

  useEffect(() => {
    if (!previewVisible || previewWidth < 640) return undefined

    let active = true
    const pendingImages = pageItems.map((item, index) => {
      const image = new window.Image()
      image.onload = () => {
        if (!active || !image.naturalWidth || !image.naturalHeight) return
        const ratio = image.naturalWidth / image.naturalHeight
        setPreviewRatios((current) => {
          const next = current?.length === pageItems.length ? [...current] : Array(pageItems.length).fill(4 / 3)
          next[index] = ratio
          return next
        })
      }
      image.onerror = () => {}
      image.src = item.src
      return image
    })

    return () => {
      active = false
      pendingImages.forEach((image) => {
        if (!image) return
        image.onload = null
        image.onerror = null
      })
    }
  }, [pageItems, previewVisible, previewWidth])

  useEffect(() => {
    if (!previewContainerRef.current || previewVisible) return undefined

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return
      setPreviewVisible(true)
      observer.disconnect()
    }, { rootMargin: '300px' })

    observer.observe(previewContainerRef.current)
    return () => observer.disconnect()
  }, [previewVisible])

  useEffect(() => {
    if (!previewContainerRef.current) return undefined

    const container = previewContainerRef.current
    const updateWidth = () => setPreviewWidth(container.clientWidth)
    const observer = new ResizeObserver(updateWidth)
    updateWidth()
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current - 1 + pageItems.length) % pageItems.length)
  }, [pageItems.length])

  const showNext = useCallback(() => {
    setActiveIndex((current) => current === null ? null : (current + 1) % pageItems.length)
  }, [pageItems.length])

  useEffect(() => {
    if (!activeItem) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowLeft') showPrevious()
      if (event.key === 'ArrowRight') showNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [activeItem, showNext, showPrevious])

  const updatePage = async (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages)
    if (safePage === page) return

    setActiveIndex(null)
    setPreviewRatios(null)
    if (serverPaginated) {
      setPageLoading(true)
      try {
        const response = await fetch(`/api/gallery?page=${safePage}&limit=${ITEMS_PER_PAGE}`, { cache: 'no-store' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Could not load gallery photos.')
        setGalleryItems(payload.data)
        setTotalPages(payload.pagination.totalPages)
        setPage(payload.pagination.page)
      } catch {
        setPageLoading(false)
        return
      }
      setPageLoading(false)
    } else {
      setPage(safePage)
    }
    window.requestAnimationFrame(() => {
      const container = previewContainerRef.current
      if (!container) return
      const top = container.getBoundingClientRect().top + window.scrollY - 96
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    })
  }

  const handleTouchStart = (event) => {
    const touch = event.changedTouches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (event) => {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return
    if (deltaX > 0) showPrevious()
    else showNext()
  }

  return (
    <>
      {!galleryItems.length ? (
        <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-[#D4A017]/30 px-6 text-center">
          <ImageOff className="size-8 text-[#8B1E1E]" aria-hidden="true" />
          <h3 className="mt-4 font-display text-2xl font-bold text-[#2B2B2B]">Our gallery is being updated.</h3>
          <p className="mt-2 text-sm text-[#6B6560]">Please check back soon for new restaurant moments.</p>
        </div>
      ) : (
        <div ref={previewContainerRef}>
          {pageLoading || !previewWidth ? (
            <CardGridSkeleton count={4} />
          ) : previewWidth < 640 ? (
            <div className="space-y-3">
              {pageItems.map((item, index) => (
                <GalleryButton key={item.id} item={item} index={index} onOpen={setActiveIndex} className="w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {previewRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-3" style={{ height: `${row.height}px`, width: `${row.width}px` }}>
                  {row.entries.map(({ item, index, ratio }) => (
                    <GalleryButton
                      key={item.id}
                      item={item}
                      index={index}
                      onOpen={setActiveIndex}
                      className="h-full shrink-0"
                      fill
                      style={{ width: `${ratio * row.height}px` }}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {paginate && totalPages > 1 ? (
        <PaginationControls page={page} totalPages={totalPages} onPageChange={updatePage} className="mt-8" />
      ) : null}

      {activeItem ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo viewer"
          onClick={() => setActiveIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-3 top-3 z-20 flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg sm:right-6 sm:top-6"
            aria-label="Close photo viewer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          {pageItems.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showPrevious() }}
                className="absolute left-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg sm:left-6"
                aria-label="Previous photo"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); showNext() }}
                className="absolute right-2 top-1/2 z-20 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white shadow-lg sm:right-6"
                aria-label="Next photo"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
            </>
          ) : null}

          <div className="flex max-h-full max-w-full items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <GalleryImage
              image={activeItem}
              loading="eager"
              className="h-auto max-h-[calc(100svh-6rem)] w-auto max-w-[calc(100vw-1.5rem)] object-contain sm:max-w-[calc(100vw-8rem)]"
              sizes="100vw"
            />
          </div>

          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-medium tabular-nums text-white/70 sm:bottom-5">
            {activeIndex + 1} / {pageItems.length}
          </p>
        </div>
      ) : null}
    </>
  )
}

function GalleryButton({ item, index, onOpen, className = '', fill = false, style }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`View ${item.alt || 'gallery photo'}`}
      className={`group block cursor-zoom-in overflow-hidden rounded-md border border-[#E4DAC9] bg-[#E8DFC8] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1E1E] focus-visible:ring-offset-2 ${className}`}
      style={style}
    >
      <GalleryImage
        image={item}
        className={`${fill ? 'size-full object-contain' : 'h-auto w-full'} transition-transform duration-500 ease-out group-hover:scale-[1.02]`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
    </button>
  )
}
