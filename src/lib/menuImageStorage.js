import { unlink } from "node:fs/promises";
import path from "node:path";

function inferSupabaseUrlFromDatabaseUrl(value) {
  if (!value) return "";

  const match = String(value).match(/(?:postgres\.|db\.)([a-z0-9]+)\.supabase\./i);
  return match?.[1] ? `https://${match[1]}.supabase.co` : "";
}

function getSupabaseStorageConfig() {
  return {
    baseUrl: (
      process.env.SUPABASE_URL
      || process.env.NEXT_PUBLIC_SUPABASE_URL
      || inferSupabaseUrlFromDatabaseUrl(process.env.DATABASE_URL)
      || inferSupabaseUrlFromDatabaseUrl(process.env.DIRECT_URL)
      || ""
    ).replace(/\/$/, ""),
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "menu-images",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

async function deleteLocalMenuImage(imageUrl) {
  const prefix = "/uploads/menu/";
  if (!imageUrl.startsWith(prefix)) return false;

  const relativePath = decodeURIComponent(imageUrl.split("?")[0].slice(prefix.length));
  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads", "menu");
  const imagePath = path.resolve(uploadsRoot, relativePath);

  if (!imagePath.startsWith(`${uploadsRoot}${path.sep}`)) return false;

  try {
    await unlink(imagePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return true;
}

async function deleteSupabaseMenuImage(imageUrl) {
  const { baseUrl, bucket, serviceRoleKey } = getSupabaseStorageConfig();
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
  if (!objectPath.startsWith("menu/") || objectPath.includes("..")) return false;

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

export async function deleteManagedMenuImage(imageUrl) {
  if (!imageUrl) return false;

  if (await deleteLocalMenuImage(imageUrl)) return true;
  return deleteSupabaseMenuImage(imageUrl);
}
