import { prisma } from "@/lib/prisma";
import { deleteManagedGalleryImage } from "@/lib/galleryStorage";

export const dynamic = "force-dynamic";

export async function DELETE(_request, context) {
  const { photoId } = await context.params;

  let existing;
  try {
    existing = await prisma.galleryPhoto.findUnique({
      where: { id: photoId },
      select: { assetId: true, src: true },
    });
  } catch (error) {
    console.error("DELETE /api/admin/gallery/[photoId] lookup", error);
    return Response.json({ error: "Failed to load gallery photo." }, { status: 500 });
  }

  if (!existing) return Response.json({ error: "Gallery photo not found." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.galleryPhoto.delete({ where: { id: photoId } });
      if (existing.assetId) await tx.mediaAsset.delete({ where: { id: existing.assetId } });
    });

    const references = await prisma.mediaAsset.count({ where: { url: existing.src } });
    if (references === 0) {
      try {
        await deleteManagedGalleryImage(existing.src);
      } catch (cleanupError) {
        console.error("Failed to delete removed gallery image", cleanupError);
      }
    }

    return Response.json({ data: { id: photoId } });
  } catch (error) {
    console.error("DELETE /api/admin/gallery/[photoId]", error);
    return Response.json({ error: "Failed to delete gallery photo." }, { status: 500 });
  }
}
