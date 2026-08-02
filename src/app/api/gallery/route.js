import { listPublishedGalleryPhotos } from "@/lib/publicGalleryData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await listPublishedGalleryPhotos();
    return Response.json({ data: photos }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/gallery", error);
    return Response.json({ error: "Failed to load gallery." }, { status: 500 });
  }
}
