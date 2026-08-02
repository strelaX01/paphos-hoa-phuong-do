import { listPublicMenuCategories } from '@/lib/publicMenuData'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const categories = await listPublicMenuCategories()

    return Response.json({
      data: categories,
      meta: { count: categories.length },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GET /api/menu/categories', error)
    return Response.json({ error: 'Menu categories are temporarily unavailable.' }, { status: 500 })
  }
}
