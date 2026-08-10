import { readLimitedJson } from "@/lib/readLimitedJson";

const MAX_ADMIN_JSON_BYTES = 128 * 1024;

export async function readAdminJson(request, maximumBytes = MAX_ADMIN_JSON_BYTES) {
  const parsed = await readLimitedJson(request, maximumBytes);
  if (parsed.error) {
    return {
      response: Response.json({ error: parsed.error }, { status: parsed.status }),
    };
  }
  return { data: parsed.data };
}
