import { NextResponse } from "next/server";

import { getAdminAccountForToken } from "@/lib/adminAuth";
import { ADMIN_SESSION_COOKIE } from "@/lib/adminSessionToken";

const LOGIN_PAGE = "/admin/login";
const PUBLIC_ADMIN_PAGES = new Set([
  LOGIN_PAGE,
  "/admin/forgot-password",
  "/admin/reset-password",
]);
const PUBLIC_ADMIN_API_PATHS = new Set([
  "/api/admin/auth/login",
  "/api/admin/auth/logout",
  "/api/admin/auth/forgot-password",
  "/api/admin/auth/reset-password",
]);

async function getActiveAccount(request) {
  return getAdminAccountForToken(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    { touch: false },
  );
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_ADMIN_PAGES.has(pathname)) {
    if (pathname !== LOGIN_PAGE) return NextResponse.next();
    const account = await getActiveAccount(request);
    return account
      ? NextResponse.redirect(new URL(account.role === "DRIVER" ? "/admin/orders" : "/admin", request.url))
      : NextResponse.next();
  }

  if (PUBLIC_ADMIN_API_PATHS.has(pathname)) return NextResponse.next();
  const account = await getActiveAccount(request);

  if (account?.role === "DRIVER") {
    if (pathname === "/admin" || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/orders"))) {
      return NextResponse.redirect(new URL("/admin/orders", request.url));
    }
    if (pathname.startsWith("/api/admin/")) {
      const isOrderMember = /^\/api\/admin\/orders\/[^/]+$/.test(pathname);
      const allowedRequest =
        (pathname === "/api/admin/orders" && request.method === "GET") ||
        (pathname === "/api/admin/orders/summary" && request.method === "GET") ||
        (isOrderMember && request.method === "PATCH") ||
        (pathname === "/api/admin/auth/change-password" && request.method === "POST");
      if (!allowedRequest) {
        return NextResponse.json(
          { error: "You do not have permission to perform this action." },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
    return NextResponse.next();
  }

  if (account?.role === "ADMIN") return NextResponse.next();

  if (pathname.startsWith("/api/admin/")) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const loginUrl = new URL(LOGIN_PAGE, request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
