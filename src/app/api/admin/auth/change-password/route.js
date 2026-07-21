import { NextResponse } from "next/server";

import { getCurrentAdminSession } from "@/lib/adminAuth";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_COOKIE_OPTIONS } from "@/lib/adminSessionToken";
import { hashPassword, verifyPassword } from "@/lib/driverCredentials";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const PASSWORD_MAX_LENGTH = 128;

function passwordError(password) {
  if (typeof password !== "string" || password.length < 10 || password.length > PASSWORD_MAX_LENGTH) {
    return "New password must contain between 10 and 128 characters.";
  }
  if (/\s/.test(password) || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "New password must include uppercase, lowercase, and number characters with no spaces.";
  }
  return null;
}

function errorResponse(message, status, headers = {}) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export async function POST(request) {
  const session = await getCurrentAdminSession();
  if (!session) return errorResponse("Authentication required.", 401);

  const rateLimit = checkRateLimit(request, {
    key: `change-password:${session.role}:${session.userId}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return errorResponse("Too many attempts. Please try again later.", 429, rateLimit.headers);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body.", 400, rateLimit.headers);
  }

  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || currentPassword.length > 256) {
    return errorResponse("Current password is required.", 422, rateLimit.headers);
  }
  const validationError = passwordError(newPassword);
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
