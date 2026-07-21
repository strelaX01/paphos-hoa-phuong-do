import { prisma } from "@/lib/prisma";
import { deleteManagedGalleryImage, uploadGalleryImage, validateGalleryImage } from "@/lib/galleryStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const validationError = validateGalleryImage(file);
  if (validationError) return Response.json({ error: validationError }, { status: 422 });

  try {
    return Response.json({ data: await uploadGalleryImage(file) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/gallery/uploads", error);
    return Response.json({ error: error.message || "Failed to upload gallery image." }, { status: 500 });
  }
}

export async function DELETE(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return Response.json({ error: "Image URL is required." }, { status: 400 });

  try {
    const references = await prisma.mediaAsset.count({ where: { url } });
    if (references > 0) return Response.json({ error: "This image is already attached to content." }, { status: 409 });

    const deleted = await deleteManagedGalleryImage(url);
    if (!deleted) return Response.json({ error: "Image is not managed by the Gallery bucket." }, { status: 422 });
    return Response.json({ data: { url } });
  } catch (error) {
    console.error("DELETE /api/admin/gallery/uploads", error);
    return Response.json({ error: "Failed to clean up gallery image." }, { status: 500 });
  }
}
