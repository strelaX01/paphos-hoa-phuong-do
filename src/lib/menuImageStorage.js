import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_MENU_IMAGE_BYTES = 3 * 1024 * 1024;

export class MenuImageStorageError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "MenuImageStorageError";
    this.status = status;
  }
}

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

function readJwtPayload(token) {
  if (!token?.startsWith("eyJ")) return null;
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function uploadManagedMenuImage(file) {
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    throw new MenuImageStorageError("Image file is required.", 400);
  }
  if (!allowedImageTypes.has(file.type)) {
    throw new MenuImageStorageError("Only JPG, PNG, or WEBP images are allowed.", 422);
  }
  if (file.size > MAX_MENU_IMAGE_BYTES) {
    throw new MenuImageStorageError("Image must be 3MB or smaller.", 422);
  }

  const { baseUrl, bucket, serviceRoleKey } = getSupabaseStorageConfig();
  if (!baseUrl || !serviceRoleKey) {
    throw new MenuImageStorageError("Supabase Storage is not configured.");
  }
  const keyPayload = readJwtPayload(serviceRoleKey);
  if (keyPayload && keyPayload.role !== "service_role") {
    throw new MenuImageStorageError("SUPABASE_SERVICE_ROLE_KEY must be the service_role key.");
  }

  const extension = allowedImageTypes.get(file.type);
  const objectPath = `menu/${Date.now()}-${randomUUID()}.${extension}`;
  const response = await fetch(`${baseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
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
    throw new MenuImageStorageError(payload.message || `Supabase Storage returned ${response.status}.`, response.status);
  }

  return `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
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
