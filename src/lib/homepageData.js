import { prisma } from '@/lib/prisma'

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value))
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
          tag: { select: { label: true } },
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
          price: formatMoney(item.price),
          image: item.image,
          tag: item.tag?.label || '',
        })),
      galleryImages,
    }
  } catch (error) {
    console.error('Failed to load homepage content', error)
    return { menuItemCount: 0, menuItems: [], galleryImages: [] }
  }
}
