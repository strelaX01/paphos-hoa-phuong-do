import { listPublicMenuSections } from '@/lib/publicMenuData'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')?.trim() || ''
  const deliverable = searchParams.get('deliverable')

  if (category && (category.length > 100 || !CATEGORY_SLUG_PATTERN.test(category))) {
    return Response.json({ error: 'Invalid category slug.' }, { status: 400 })
  }

  if (deliverable !== null && deliverable !== 'true' && deliverable !== 'false') {
    return Response.json({ error: 'Deliverable must be true or false.' }, { status: 400 })
  }

  try {
    const sections = await listPublicMenuSections({
      categorySlug: category,
      deliverableOnly: deliverable === 'true',
    })

    return Response.json({
      data: sections,
      meta: {
        categoryCount: sections.length,
        itemCount: sections.reduce((total, section) => total + section.itemCount, 0),
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET /api/menu', error)
    return Response.json({ error: 'Menu is temporarily unavailable.' }, { status: 500 })
  }
}
