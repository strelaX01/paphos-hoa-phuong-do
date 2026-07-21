import { randomUUID } from "node:crypto";

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function inferSupabaseUrlFromDatabaseUrl(value) {
  if (!value) return "";
  const match = String(value).match(/(?:postgres\.|db\.)([a-z0-9]+)\.supabase\./i);
  return match?.[1] ? `https://${match[1]}.supabase.co` : "";
}

export function getGalleryStorageConfig() {
  return {
    baseUrl: (
      process.env.SUPABASE_URL
      || process.env.NEXT_PUBLIC_SUPABASE_URL
      || inferSupabaseUrlFromDatabaseUrl(process.env.DATABASE_URL)
      || inferSupabaseUrlFromDatabaseUrl(process.env.DIRECT_URL)
      || ""
    ).replace(/\/$/, ""),
    bucket: process.env.SUPABASE_GALLERY_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "gallery-images",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

export function validateGalleryImage(file) {
  if (!file || typeof file === "string") return "Image file is required.";
  if (!allowedImageTypes.has(file.type)) return "Only JPG, PNG, or WebP images are allowed.";
  if (file.size > 3 * 1024 * 1024) return "Compressed image must be 3MB or smaller.";
  return null;
}

export async function uploadGalleryImage(file) {
  const { baseUrl, bucket, serviceRoleKey } = getGalleryStorageConfig();
  if (!baseUrl || !serviceRoleKey) throw new Error("Supabase Storage is not configured for gallery uploads.");

  const extension = allowedImageTypes.get(file.type);
  const storedName = `${Date.now()}-${randomUUID()}.${extension}`;
  const objectPath = `gallery/${storedName}`;
  const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Failed to upload gallery image.");
  }

  return {
    bucket,
    fileName: file.name || storedName,
    mimeType: file.type,
    path: objectPath,
    sizeBytes: file.size,
    url: `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`,
  };
}

export async function deleteManagedGalleryImage(imageUrl) {
  if (!imageUrl) return false;

  const { baseUrl, bucket, serviceRoleKey } = getGalleryStorageConfig();
  if (!baseUrl || !serviceRoleKey) return false;

  let image;
  let storage;
  try {
    image = new URL(imageUrl);
    storage = new URL(baseUrl);
  } catch {
    return false;
  }

  const publicPrefix = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`;
  if (image.origin !== storage.origin || !image.pathname.startsWith(publicPrefix)) return false;

  const objectPath = decodeURIComponent(image.pathname.slice(publicPrefix.length));
  if (!objectPath.startsWith("gallery/") || objectPath.includes("..")) return false;

  const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [objectPath] }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Failed to delete gallery image.");
  }

  return true;
}
