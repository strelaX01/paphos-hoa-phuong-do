import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSessionToken";
import { prisma } from "@/lib/prisma";

const LOGIN_PAGE = "/admin/login";
const PUBLIC_ADMIN_API_PATHS = new Set([
  "/api/admin/auth/login",
  "/api/admin/auth/logout",
]);

async function getActiveAccount(request) {
  const session = verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!session) return null;

  if (session.role === "DRIVER") {
    const driver = await prisma.driverAccount.findFirst({
      where: { id: session.userId, status: "ACTIVE" },
      select: { id: true },
    });
    return driver ? { ...driver, role: "DRIVER" } : null;
  }

  const admin = await prisma.adminUser.findFirst({
    where: { id: session.userId, role: "ADMIN", status: "ACTIVE" },
    select: { id: true, role: true },
  });
  return admin;
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (pathname === LOGIN_PAGE) {
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
      const allowedRequest =
        (pathname === "/api/admin/orders" && ["GET", "PATCH"].includes(request.method)) ||
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
