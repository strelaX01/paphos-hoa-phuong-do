import { NextResponse } from "next/server";

import { hasTrustedAdminOrigin } from "@/lib/adminApiAuth";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/authRateLimit";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_OPTIONS } from "@/lib/adminSessionToken";
import { createStoredAdminSession, revokeAccountSessions } from "@/lib/adminSessionStore";
import { hashPassword, passwordNeedsRehash, verifyPassword } from "@/lib/driverCredentials";
import { prisma } from "@/lib/prisma";
import { readLimitedJson } from "@/lib/readLimitedJson";

const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;
const DUMMY_PASSWORD_HASH = `scrypt$00000000000000000000000000000000$${"0".repeat(128)}`;

function jsonError(message, status, headers = {}) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export async function POST(request) {
  if (!hasTrustedAdminOrigin(request)) return jsonError("Cross-site request blocked.", 403);

  const parsed = await readLimitedJson(request);
  if (parsed.error) return jsonError(parsed.error, parsed.status);
  const body = parsed.data;

  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const rateLimit = await checkLoginRateLimit(request, USERNAME_PATTERN.test(username) ? username : "");
  if (!rateLimit.allowed) {
    return jsonError("Too many login attempts. Please try again later.", 429, rateLimit.headers);
  }
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
        temporaryPasswordExpiresAt: true,
        mustChangePassword: true,
        status: true,
      },
    }),
  ]);
  const account = adminUser || (driverAccount ? { ...driverAccount, role: "DRIVER" } : null);
  const accountPasswordHash = account?.passwordHash || account?.temporaryPasswordHash || DUMMY_PASSWORD_HASH;
  const passwordMatches = await verifyPassword(password, accountPasswordHash);
  const usesTemporaryPassword = Boolean(account && !account.passwordHash && account.temporaryPasswordHash);
  const temporaryPasswordExpired = usesTemporaryPassword && (
    !account.temporaryPasswordExpiresAt
    || new Date(account.temporaryPasswordExpiresAt) <= new Date()
  );
  if (!account || !passwordMatches || account.status !== "ACTIVE" || temporaryPasswordExpired) {
    return jsonError("Invalid username or password.", 401, rateLimit.headers);
  }
  const upgradedPasswordHash = passwordNeedsRehash(accountPasswordHash)
    ? await hashPassword(password)
    : null;

  const now = new Date();
  if (account.role === "DRIVER") {
    await prisma.driverAccount.update({
      where: { id: account.id },
      data: {
        lastLoginAt: now,
        ...(upgradedPasswordHash
          ? (account.passwordHash
              ? { passwordHash: upgradedPasswordHash }
              : { temporaryPasswordHash: upgradedPasswordHash })
          : {}),
      },
    });
  } else {
    await prisma.$transaction([
      prisma.adminUser.update({
        where: { id: account.id },
        data: { lastLoginAt: now, ...(upgradedPasswordHash ? { passwordHash: upgradedPasswordHash } : {}) },
      }),
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

  if (account.role === "DRIVER" && account.mustChangePassword) {
    await revokeAccountSessions(account.id, "DRIVER");
  }
  const sessionToken = await createStoredAdminSession(account);
  await clearLoginRateLimit(request, username);

  const response = NextResponse.json(
    {
      user: {
        id: account.id,
        name: account.name,
        username: account.username,
        role: account.role,
        mustChangePassword: Boolean(account.mustChangePassword),
      },
      redirectTo: account.role === "DRIVER" ? "/admin/orders" : "/admin",
    },
    { headers: { "Cache-Control": "no-store", ...rateLimit.headers } },
  );
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    sessionToken,
    ADMIN_SESSION_COOKIE_OPTIONS,
  );
  return response;
}
