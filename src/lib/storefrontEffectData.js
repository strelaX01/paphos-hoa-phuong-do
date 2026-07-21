import { cache } from 'react'

import { prisma } from '@/lib/prisma'

export const getActiveStorefrontEffect = cache(async function getActiveStorefrontEffect() {
  try {
    const settings = await prisma.storefrontSettings.findUnique({
      where: { id: 'default' },
      select: {
        festivalEffectEnabled: true,
        festivalEffect: true,
        effectIntensity: true,
        effectStartsAt: true,
        effectEndsAt: true,
        updatedAt: true,
      },
    })

    if (!settings?.festivalEffectEnabled || settings.festivalEffect === 'NONE') return null

    const today = getCyprusDate()
    if (settings.effectStartsAt && settings.effectStartsAt.toISOString().slice(0, 10) > today) return null
    if (settings.effectEndsAt && settings.effectEndsAt.toISOString().slice(0, 10) < today) return null

    return {
      effect: settings.festivalEffect,
      intensity: settings.effectIntensity,
      updatedAt: settings.updatedAt.toISOString(),
    }
  } catch (error) {
    console.error('Failed to load storefront festival effect', error)
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
