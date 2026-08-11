import 'server-only'

import { prisma } from '@/lib/prisma'

const MENU_SECTION_DESCRIPTION = 'Prepared fresh to order using carefully selected ingredients and our kitchen recipes.'

export async function listPublicMenuSections({ categorySlug = '', deliverableOnly = false } = {}) {
  const itemWhere = {
    isActive: true,
    ...(deliverableOnly ? { deliverable: true } : {}),
    OR: [
      { variants: { none: {} } },
      { variants: { some: { isActive: true } } },
    ],
  }

  const categories = await prisma.menuCategory.findMany({
    where: {
      isActive: true,
      ...(categorySlug ? { slug: categorySlug } : {}),
      items: { some: itemWhere },
    },
    orderBy: { title: 'asc' },
    select: {
      slug: true,
      title: true,
      items: {
        where: itemWhere,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          slug: true,
          name: true,
          nameEn: true,
          description: true,
          price: true,
          image: true,
          deliverable: true,
          isSpicy: true,
          variants: {
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
            select: { id: true, label: true, price: true },
          },
        },
      },
    },
  })

  return categories.map((category) => ({
    id: category.slug,
    slug: category.slug,
    title: category.title,
    itemCount: category.items.length,
    items: category.items.map((item) => ({
      id: item.slug,
      slug: item.slug,
      name: item.name,
      nameEn: item.nameEn || '',
      description: item.description || '',
      price: Number(item.price),
      image: item.image || '',
      deliverable: item.deliverable,
      isSpicy: item.isSpicy,
      variants: item.variants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        price: Number(variant.price),
      })),
    })),
  }))
}

export async function listPublicMenuCategories() {
  const availableItemWhere = {
    isActive: true,
    OR: [
      { variants: { none: {} } },
      { variants: { some: { isActive: true } } },
    ],
  }
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true, items: { some: availableItemWhere } },
    orderBy: { title: 'asc' },
    select: {
      slug: true,
      title: true,
      items: {
        where: availableItemWhere,
        select: { id: true },
      },
    },
  })

  return categories.map((category) => ({
    id: category.slug,
    slug: category.slug,
    title: category.title,
    itemCount: category.items.length,
  }))
}

export async function getPublicMenuPageSections() {
  const sections = await listPublicMenuSections()

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    eyebrow: `${section.itemCount} ${section.itemCount === 1 ? 'dish' : 'dishes'}`,
    description: MENU_SECTION_DESCRIPTION,
    items: section.items.map((item) => ({
      id: item.id,
      name: item.name,
      nameEn: item.nameEn,
      description: item.description,
      price: formatMenuItemPrice(item),
      image: item.image,
      deliverable: item.deliverable,
      isSpicy: item.isSpicy,
      choices: item.variants.map((variant) => variant.label),
    })),
  }))
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value))
}

function formatMenuItemPrice(item) {
  if (!item.variants.length) return formatMoney(item.price)

  const prices = item.variants.map((variant) => variant.price)
  const minimum = Math.min(...prices)
  const maximum = Math.max(...prices)
  return minimum === maximum ? formatMoney(minimum) : `${formatMoney(minimum)} - ${formatMoney(maximum)}`
}
