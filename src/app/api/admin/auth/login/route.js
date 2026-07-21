import { NextResponse } from "next/server";

import { createAdminSessionToken, ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_OPTIONS } from "@/lib/adminSessionToken";
import { verifyPassword } from "@/lib/driverCredentials";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;
const DUMMY_PASSWORD_HASH = `scrypt$00000000000000000000000000000000$${"0".repeat(128)}`;

function jsonError(message, status, headers = {}) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export async function POST(request) {
  const rateLimit = checkRateLimit(request, {
    key: "admin-login",
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return jsonError("Too many login attempts. Please try again later.", 429, rateLimit.headers);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400, rateLimit.headers);
  }

  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!USERNAME_PATTERN.test(username) || !password || password.length > 256) {
    return jsonError("Please enter a valid username and password.", 400, rateLimit.headers);
  }

  const [[adminUser], driverAccount] = await Promise.all([
    prisma.$queryRaw`
      SELECT "id", "name", "username", "passwordHash", "role", "status"
      FROM "AdminUser"
      WHERE "username" = ${username}
        AND "role" = 'ADMIN'
      LIMIT 1
    `,
    prisma.driverAccount.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        passwordHash: true,
        temporaryPasswordHash: true,
        status: true,
      },
    }),
  ]);
  const account = adminUser || (driverAccount ? { ...driverAccount, role: "DRIVER" } : null);
  const accountPasswordHash = account?.passwordHash || account?.temporaryPasswordHash || DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(password, accountPasswordHash);
  if (!account || !passwordMatches || account.status !== "ACTIVE") {
    return jsonError("Invalid username or password.", 401, rateLimit.headers);
  }

  const now = new Date();
  if (account.role === "DRIVER") {
    await prisma.driverAccount.update({ where: { id: account.id }, data: { lastLoginAt: now } });
  } else {
    await prisma.$transaction([
      prisma.adminUser.update({ where: { id: account.id }, data: { lastLoginAt: now } }),
      prisma.auditLog.create({
        data: {
          actorId: account.id,
          action: "LOGIN",
          entityType: "AdminUser",
          entityId: account.id,
          description: "Admin signed in.",
        },
      }),
    ]);
  }

  const response = NextResponse.json(
    {
      user: { id: account.id, name: account.name, username: account.username, role: account.role },
      redirectTo: account.role === "DRIVER" ? "/admin/orders" : "/admin",
    },
    { headers: { "Cache-Control": "no-store", ...rateLimit.headers } },
  );
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    createAdminSessionToken(account),
    ADMIN_SESSION_COOKIE_OPTIONS,
  );
  return response;
}
