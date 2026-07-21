import { cache } from 'react'

import { prisma } from '@/lib/prisma'

export const getActiveStorefrontNotice = cache(async function getActiveStorefrontNotice() {
  try {
    const notice = await prisma.storefrontNotice.findUnique({
      where: { id: 'default' },
      select: {
        id: true,
        enabled: true,
        type: true,
        priority: true,
        title: true,
        message: true,
        ctaEnabled: true,
        ctaLabel: true,
        ctaHref: true,
        startsAt: true,
        endsAt: true,
        updatedAt: true,
      },
    })

    if (!notice?.enabled) return null

    const today = getCyprusDate()
    if (notice.startsAt && notice.startsAt.toISOString().slice(0, 10) > today) return null
    if (notice.endsAt && notice.endsAt.toISOString().slice(0, 10) < today) return null

    return {
      id: notice.id,
      type: notice.type,
      priority: notice.priority,
      title: notice.title,
      message: notice.message,
      ctaLabel: notice.ctaEnabled ? notice.ctaLabel : null,
      ctaHref: notice.ctaEnabled && notice.ctaHref?.startsWith('/') ? notice.ctaHref : null,
      updatedAt: notice.updatedAt.toISOString(),
    }
  } catch (error) {
    console.error('Failed to load storefront notice', error)
    return null
  }
})

function getCyprusDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Nicosia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const read = (type) => parts.find((part) => part.type === type)?.value
  return `${read('year')}-${read('month')}-${read('day')}`
}
