import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { readAdminJson } from "@/lib/adminJsonRequest";
import { prisma } from "@/lib/prisma";
import { deleteManagedVideo, uploadVideoFile, validateVideoFile } from "@/lib/videoStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_REQUEST_BYTES = 16 * 1024 * 1024;

export async function POST(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "Upload request is too large." }, { status: 413 });
  }
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const validationError = validateVideoFile(file);
  if (validationError) return Response.json({ error: validationError }, { status: 422 });

  try {
    const upload = await uploadVideoFile(file);
    return Response.json({ data: upload }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/videos/uploads", error);
    return Response.json({ error: error.message || "Failed to upload video." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const parsed = await readAdminJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return Response.json({ error: "Video URL is required." }, { status: 400 });

  try {
    const references = await prisma.mediaAsset.count({ where: { url } });
    if (references > 0) {
      return Response.json({ error: "This video is already attached to content." }, { status: 409 });
    }

    const deleted = await deleteManagedVideo(url);
    if (!deleted) return Response.json({ error: "Video is not managed by this Storage bucket." }, { status: 422 });
    return Response.json({ data: { url } });
  } catch (error) {
    console.error("DELETE /api/admin/videos/uploads", error);
    return Response.json({ error: "Failed to clean up uploaded video." }, { status: 500 });
  }
}
