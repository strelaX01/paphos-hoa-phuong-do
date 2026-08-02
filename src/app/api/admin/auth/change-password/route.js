import { NextResponse } from "next/server";

import { hasTrustedAdminOrigin } from "@/lib/adminApiAuth";
import { getAdminPasswordError } from "@/lib/adminPasswordPolicy";
import { getCurrentAdminAccount, getCurrentAdminSession } from "@/lib/adminAuth";
import { checkAccountRateLimit } from "@/lib/authRateLimit";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_OPTIONS } from "@/lib/adminSessionToken";
import { revokeAccountSessions } from "@/lib/adminSessionStore";
import { hashPassword, verifyPassword } from "@/lib/driverCredentials";
import { prisma } from "@/lib/prisma";
import { readLimitedJson } from "@/lib/readLimitedJson";

function errorResponse(message, status, headers = {}) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export async function POST(request) {
  if (!hasTrustedAdminOrigin(request)) return errorResponse("Cross-site request blocked.", 403);
  const session = await getCurrentAdminSession();
  if (!session) return errorResponse("Authentication required.", 401);
  const currentAccount = await getCurrentAdminAccount();
  if (!currentAccount) return errorResponse("Account is no longer active.", 403);

  const rateLimit = await checkAccountRateLimit(request, currentAccount);
  if (!rateLimit.allowed) {
    return errorResponse("Too many attempts. Please try again later.", 429, rateLimit.headers);
  }

  const parsed = await readLimitedJson(request);
  if (parsed.error) return errorResponse(parsed.error, parsed.status, rateLimit.headers);
  const body = parsed.data;

  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || currentPassword.length > 256) {
    return errorResponse("Current password is required.", 422, rateLimit.headers);
  }
  const validationError = getAdminPasswordError(newPassword);
  if (validationError) return errorResponse(validationError, 422, rateLimit.headers);

  const account = session.role === "DRIVER"
    ? await prisma.driverAccount.findFirst({
        where: { id: session.userId, status: "ACTIVE" },
        select: { id: true, passwordHash: true, temporaryPasswordHash: true },
      })
    : await prisma.adminUser.findFirst({
        where: { id: session.userId, role: "ADMIN", status: "ACTIVE" },
        select: { id: true, passwordHash: true },
      });
  if (!account) return errorResponse("Account is no longer active.", 403, rateLimit.headers);

  const currentHash = account.passwordHash || account.temporaryPasswordHash;
  const currentMatches = await verifyPassword(currentPassword, currentHash);
  if (!currentMatches) return errorResponse("Current password is incorrect.", 422, rateLimit.headers);
  if (await verifyPassword(newPassword, currentHash)) {
    return errorResponse("New password must be different from the current password.", 422, rateLimit.headers);
  }

  const passwordHash = await hashPassword(newPassword);
  if (session.role === "DRIVER") {
    await prisma.driverAccount.update({
      where: { id: account.id },
      data: {
        passwordHash,
        temporaryPasswordHash: null,
        temporaryPasswordExpiresAt: null,
        mustChangePassword: false,
      },
    });
  } else {
    await prisma.$transaction([
      prisma.adminUser.update({ where: { id: account.id }, data: { passwordHash } }),
      prisma.auditLog.create({
        data: {
          actorId: account.id,
          action: "PASSWORD_CHANGED",
          entityType: "AdminUser",
          entityId: account.id,
          description: "Admin changed their password.",
        },
      }),
    ]);
  }

  await revokeAccountSessions(session.userId, session.role);

  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store", ...rateLimit.headers } },
  );
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...ADMIN_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
