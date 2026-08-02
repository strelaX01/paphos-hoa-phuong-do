import { readLimitedJson } from "@/lib/readLimitedJson";

const MAX_MULTIPART_BYTES = 4 * 1024 * 1024;
const MAX_PAYLOAD_CHARACTERS = 4096;

export async function readMenuItemRequest(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    const parsed = await readLimitedJson(request);
    return parsed.error
      ? { error: parsed.error, status: parsed.status }
      : { data: parsed.data, imageFile: null };
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
    return { error: "Request body is too large.", status: 413 };
  }

  try {
    const formData = await request.formData();
    const payload = formData.get("payload");
    const imageFile = formData.get("image");
    if (typeof payload !== "string" || payload.length > MAX_PAYLOAD_CHARACTERS) {
      return { error: "Invalid item payload.", status: 400 };
    }
    return {
      data: JSON.parse(payload),
      imageFile: imageFile && typeof imageFile !== "string" && imageFile.size > 0 ? imageFile : null,
    };
  } catch {
    return { error: "Invalid multipart request.", status: 400 };
  }
}
