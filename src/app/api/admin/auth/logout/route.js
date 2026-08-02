import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hasTrustedAdminOrigin } from "@/lib/adminApiAuth";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_OPTIONS } from "@/lib/adminSessionToken";
import { revokeStoredAdminSession } from "@/lib/adminSessionStore";

export async function POST(request) {
  if (!hasTrustedAdminOrigin(request)) {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }
  const cookieStore = await cookies();
  await revokeStoredAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...ADMIN_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
