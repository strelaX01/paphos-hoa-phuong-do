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

const BEVERAGE_CATEGORY_PATTERN = /drink|beverage|tea|coffee|smoothie|juice|soft/i

function selectHomepageMenuItems(items, limit = 4) {
  if (!items.length) return []

  const isBeverage = (item) => BEVERAGE_CATEGORY_PATTERN.test(`${item.category?.title || ''} ${item.category?.slug || ''}`)
  const featured = items.find((item) => !isBeverage(item)) || items[0]
  const selected = [featured]
  const selectedIds = new Set([featured.id])
  const usedCategories = new Set([featured.category?.id].filter(Boolean))

  for (const item of items) {
    if (selected.length >= limit) break
    const categoryId = item.category?.id
    if (selectedIds.has(item.id) || (categoryId && usedCategories.has(categoryId))) continue
    selected.push(item)
    selectedIds.add(item.id)
    if (categoryId) usedCategories.add(categoryId)
  }

  for (const item of items) {
    if (selected.length >= limit) break
    if (selectedIds.has(item.id)) continue
    selected.push(item)
    selectedIds.add(item.id)
  }

  return selected
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
        take: 32,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          category: {
            select: { id: true, title: true, slug: true },
          },
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
      menuItems: selectHomepageMenuItems(menuItems)
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
