import 'server-only'

import { prisma } from '@/lib/prisma'

export async function listPublishedGalleryPhotos() {
  return prisma.galleryPhoto.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, src: true, alt: true },
  })
}

export async function getPublishedGalleryPhotosOrEmpty() {
  try {
    return await listPublishedGalleryPhotos()
  } catch (error) {
    console.error('Failed to load public gallery', error)
    return []
  }
}
