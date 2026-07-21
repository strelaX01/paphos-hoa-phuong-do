import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const photos = await prisma.galleryPhoto.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: { id: true, src: true, alt: true },
    });
    return Response.json({ data: photos });
  } catch (error) {
    console.error("GET /api/gallery", error);
    return Response.json({ error: "Failed to load gallery." }, { status: 500 });
  }
}
