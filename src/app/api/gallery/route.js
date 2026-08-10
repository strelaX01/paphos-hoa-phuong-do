import { getPublishedGalleryPage } from "@/lib/publicGalleryData";

export const dynamic = "force-dynamic";

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = positiveInteger(searchParams.get("page"), 1, 100000);
    const limit = positiveInteger(searchParams.get("limit"), 6, 24);
    const result = await getPublishedGalleryPage({ page, limit });
    return Response.json({ data: result.items, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/gallery", error);
    return Response.json({ error: "Failed to load gallery." }, { status: 500 });
  }
}
