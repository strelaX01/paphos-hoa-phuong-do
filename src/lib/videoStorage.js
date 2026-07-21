import { randomUUID } from "node:crypto";

const allowedVideoTypes = new Map([
  ["video/mp4", "mp4"],
  ["video/quicktime", "mov"],
  ["video/webm", "webm"],
]);

function inferSupabaseUrlFromDatabaseUrl(value) {
  if (!value) return "";

  const match = String(value).match(/(?:postgres\.|db\.)([a-z0-9]+)\.supabase\./i);
  return match?.[1] ? `https://${match[1]}.supabase.co` : "";
}

export function getVideoStorageConfig() {
  return {
    baseUrl: (
      process.env.SUPABASE_URL
      || process.env.NEXT_PUBLIC_SUPABASE_URL
      || inferSupabaseUrlFromDatabaseUrl(process.env.DATABASE_URL)
      || inferSupabaseUrlFromDatabaseUrl(process.env.DIRECT_URL)
      || ""
    ).replace(/\/$/, ""),
    bucket: process.env.SUPABASE_VIDEO_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "video-specials",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

export function validateVideoFile(file) {
  if (!file || typeof file === "string") return "Video file is required.";
  if (!allowedVideoTypes.has(file.type)) return "Only MP4, MOV, or WebM videos are allowed.";
  if (file.size > 15 * 1024 * 1024) return "Video must be 15MB or smaller.";
  return null;
}

export async function uploadVideoFile(file) {
  const { baseUrl, bucket, serviceRoleKey } = getVideoStorageConfig();
  if (!baseUrl || !serviceRoleKey) {
    throw new Error("Supabase Storage is not configured for video uploads.");
  }

  const extension = allowedVideoTypes.get(file.type);
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const objectPath = `videos/${fileName}`;
  const uploadUrl = `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`;
  const response = await fetch(uploadUrl, {
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
    throw new Error(payload.message || "Failed to upload video to Supabase Storage.");
  }

  return {
    bucket,
    fileName: file.name || fileName,
    mimeType: file.type,
    path: objectPath,
    sizeBytes: file.size,
    url: `${baseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`,
  };
}

export async function deleteManagedVideo(videoUrl) {
  if (!videoUrl) return false;

  const { baseUrl, bucket, serviceRoleKey } = getVideoStorageConfig();
  if (!baseUrl || !serviceRoleKey) return false;

  let video;
  let storage;
  try {
    video = new URL(videoUrl);
    storage = new URL(baseUrl);
  } catch {
    return false;
  }

  const publicPrefix = `/storage/v1/object/public/${encodeURIComponent(bucket)}/`;
  if (video.origin !== storage.origin || !video.pathname.startsWith(publicPrefix)) return false;

  const objectPath = decodeURIComponent(video.pathname.slice(publicPrefix.length));
  if (!objectPath.startsWith("videos/") || objectPath.includes("..")) return false;

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
    throw new Error(payload.message || `Supabase Storage returned ${response.status}.`);
  }

  return true;
}
