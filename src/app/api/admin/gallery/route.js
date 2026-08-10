import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { readAdminJson } from "@/lib/adminJsonRequest";
import { prisma } from "@/lib/prisma";
import { galleryPhotoSelect, serializeGalleryPhoto } from "@/lib/galleryPhotoData";
import { deleteManagedGalleryImage } from "@/lib/galleryStorage";

export const dynamic = "force-dynamic";

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const page = positiveInteger(searchParams.get("page"), 1, 100000);
    const limit = positiveInteger(searchParams.get("limit"), 24, 50);
    const [photos, total] = await prisma.$transaction([
      prisma.galleryPhoto.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: galleryPhotoSelect,
      }),
      prisma.galleryPhoto.count(),
    ]);
    return Response.json({
      data: photos.map(serializeGalleryPhoto),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("GET /api/admin/gallery", error);
    return Response.json({ error: "Failed to load gallery photos." }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const parsed = await readAdminJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

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
