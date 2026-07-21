import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function inferSupabaseUrlFromDatabaseUrl(value) {
  if (!value) return "";

  const match = String(value).match(/(?:postgres\.|db\.)([a-z0-9]+)\.supabase\./i);
  return match?.[1] ? `https://${match[1]}.supabase.co` : "";
}

function readJwtPayload(token) {
  if (!token?.startsWith("eyJ")) return null;

  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function POST(request) {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    inferSupabaseUrlFromDatabaseUrl(process.env.DATABASE_URL) ||
    inferSupabaseUrlFromDatabaseUrl(process.env.DIRECT_URL);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "menu-images";

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [
      !supabaseUrl ? "SUPABASE_URL" : null,
      !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter(Boolean);

    return Response.json(
      { error: `Supabase Storage is not configured. Add ${missing.join(" and ")}.` },
      { status: 500 }
    );
  }

  const keyPayload = readJwtPayload(serviceRoleKey);
  if (keyPayload && keyPayload.role !== "service_role") {
    return Response.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY must be the service_role key, not the anon key." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!allowedTypes.has(file.type)) {
    return Response.json({ error: "Only JPG, PNG, or WEBP images are allowed." }, { status: 422 });
  }

  if (file.size > 3 * 1024 * 1024) {
    return Response.json({ error: "Image must be 3MB or smaller." }, { status: 422 });
  }

  const extension = allowedTypes.get(file.type);
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`;
  const objectPath = `menu/${fileName}`;
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${objectPath}`;

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}));
    const message = error.message || "Failed to upload image to Supabase Storage.";
    const rlsMessage = message.toLowerCase().includes("row-level security")
      ? "Supabase Storage rejected the upload because of RLS. Use the real service_role key or add a Storage insert policy for this bucket."
      : message;

    return Response.json(
      { error: rlsMessage },
      { status: uploadResponse.status }
    );
  }

  return Response.json(
    {
      data: {
        url: `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`,
        path: objectPath,
        bucket,
      },
    },
    { status: 201 }
  );
}
