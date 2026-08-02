import { prisma } from '@/lib/prisma'

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value))
}

function formatMenuItemPrice(item) {
  if (!item.variants?.length) return formatMoney(item.price)
  const prices = item.variants.map((variant) => Number(variant.price))
  const minimum = Math.min(...prices)
  const maximum = Math.max(...prices)
  return minimum === maximum ? formatMoney(minimum) : `${formatMoney(minimum)} - ${formatMoney(maximum)}`
}

export async function getHomepageContentData() {
  const activeMenuWhere = {
    isActive: true,
    category: { isActive: true },
  }

  try {
    const [menuItems, menuItemCount, galleryImages] = await prisma.$transaction([
      prisma.menuItem.findMany({
        where: { ...activeMenuWhere, image: { not: null } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 4,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          variants: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
            select: { label: true, price: true },
          },
        },
      }),
      prisma.menuItem.count({ where: activeMenuWhere }),
      prisma.galleryPhoto.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 6,
        select: { id: true, src: true, alt: true },
      }),
    ])

    return {
      menuItemCount,
      menuItems: menuItems
        .filter((item) => item.image)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: formatMenuItemPrice(item),
          image: item.image,
        })),
      galleryImages,
    }
  } catch (error) {
    console.error('Failed to load homepage content', error)
    return { menuItemCount: 0, menuItems: [], galleryImages: [] }
  }
}
