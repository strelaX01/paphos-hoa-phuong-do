import 'server-only'

import { prisma } from '@/lib/prisma'

const gallerySelect = { id: true, src: true, alt: true }

export async function getPublishedGalleryPage({ page = 1, limit = 6 } = {}) {
  const where = { status: 'PUBLISHED' }
  const [items, total] = await prisma.$transaction([
    prisma.galleryPhoto.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: gallerySelect,
    }),
    prisma.galleryPhoto.count({ where }),
  ])
  return { items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

export async function getPublishedGalleryPageOrEmpty(options) {
  try {
    return await getPublishedGalleryPage(options)
  } catch (error) {
    console.error('Failed to load public gallery', error)
    return { items: [], page: 1, limit: options?.limit || 6, total: 0, totalPages: 1 }
  }
}
