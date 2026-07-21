import { prisma } from "@/lib/prisma";
import { galleryPhotoSelect, serializeGalleryPhoto } from "@/lib/galleryPhotoData";
import { deleteManagedGalleryImage } from "@/lib/galleryStorage";

export const dynamic = "force-dynamic";

function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const photos = await prisma.galleryPhoto.findMany({
      orderBy: { createdAt: "desc" },
      select: galleryPhotoSelect,
    });
    return Response.json({ data: photos.map(serializeGalleryPhoto) });
  } catch (error) {
    console.error("GET /api/admin/gallery", error);
    return Response.json({ error: "Failed to load gallery photos." }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const src = typeof body?.src === "string" ? body.src.trim() : "";
  if (!src || !isValidImageUrl(src)) return Response.json({ error: "A valid image URL is required." }, { status: 422 });

  const asset = body.asset || {};
  const isFreshUpload = typeof asset.path === "string" && asset.path.startsWith("gallery/");

  try {
    const photo = await prisma.$transaction(async (tx) => {
      const mediaAsset = await tx.mediaAsset.create({
        data: {
          type: "IMAGE",
          url: src,
          alt: "Hoa Phuong Do restaurant photo",
          fileName: typeof asset.fileName === "string" ? asset.fileName.slice(0, 255) : null,
          mimeType: typeof asset.mimeType === "string" ? asset.mimeType.slice(0, 120) : null,
          sizeBytes: Number.isInteger(asset.sizeBytes) ? asset.sizeBytes : null,
        },
      });

      return tx.galleryPhoto.create({
        data: {
          assetId: mediaAsset.id,
          src,
          alt: "Hoa Phuong Do restaurant photo",
          status: "PUBLISHED",
        },
        select: galleryPhotoSelect,
      });
    });

    return Response.json({ data: serializeGalleryPhoto(photo) }, { status: 201 });
  } catch (error) {
    if (isFreshUpload) {
      try {
        await deleteManagedGalleryImage(src);
      } catch (cleanupError) {
        console.error("Failed to clean up gallery image after create error", cleanupError);
      }
    }
    console.error("POST /api/admin/gallery", error);
    return Response.json({ error: "Failed to create gallery photo." }, { status: 500 });
  }
}
