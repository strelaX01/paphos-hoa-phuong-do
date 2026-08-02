import { after, NextResponse } from "next/server";

import { hasTrustedAdminOrigin } from "@/lib/adminApiAuth";
import { getAdminPasswordError } from "@/lib/adminPasswordPolicy";
import { sendAdminPasswordChangedEmail } from "@/lib/adminRecoveryEmail";
import { checkPasswordResetAttemptRateLimit } from "@/lib/authRateLimit";
import { hashPassword, verifyPassword } from "@/lib/driverCredentials";
import { hashPasswordResetToken } from "@/lib/passwordResetToken";
import { prisma } from "@/lib/prisma";
import { readLimitedJson } from "@/lib/readLimitedJson";

const INVALID_TOKEN_MESSAGE = "This password reset link is invalid or has expired.";

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

  const token = typeof parsed.data?.token === "string" ? parsed.data.token : "";
  const newPassword = typeof parsed.data?.newPassword === "string" ? parsed.data.newPassword : "";
  const tokenHash = hashPasswordResetToken(token);
  const rateLimit = await checkPasswordResetAttemptRateLimit(request, tokenHash);
  if (!rateLimit.allowed) {
    return jsonError("Too many reset attempts. Please try again later.", 429, rateLimit.headers);
  }
  if (!tokenHash) return jsonError(INVALID_TOKEN_MESSAGE, 400, rateLimit.headers);

  const passwordError = getAdminPasswordError(newPassword);
  if (passwordError) return jsonError(passwordError, 422, rateLimit.headers);

  const now = new Date();
  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    select: {
      id: true,
      user: {
        select: { id: true, name: true, email: true, passwordHash: true, role: true, status: true },
      },
    },
  });
  if (!resetRecord || resetRecord.user.role !== "ADMIN" || resetRecord.user.status !== "ACTIVE") {
    return jsonError(INVALID_TOKEN_MESSAGE, 400, rateLimit.headers);
  }
  if (await verifyPassword(newPassword, resetRecord.user.passwordHash)) {
    return jsonError("Choose a password different from your current password.", 422, rateLimit.headers);
  }

  const passwordHash = await hashPassword(newPassword);
  try {
    await prisma.$transaction(async (transaction) => {
      const consumed = await transaction.passwordResetToken.updateMany({
        where: { id: resetRecord.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw new Error("RESET_TOKEN_ALREADY_CONSUMED");

      const updated = await transaction.adminUser.updateMany({
        where: { id: resetRecord.user.id, role: "ADMIN", status: "ACTIVE" },
        data: { passwordHash },
      });
      if (updated.count !== 1) throw new Error("ADMIN_ACCOUNT_UNAVAILABLE");

      await Promise.all([
        transaction.passwordResetToken.updateMany({
          where: { userId: resetRecord.user.id, usedAt: null },
          data: { usedAt: now },
        }),
        transaction.adminSession.updateMany({
          where: { userId: resetRecord.user.id, role: "ADMIN", revokedAt: null },
          data: { revokedAt: now },
        }),
        transaction.auditLog.create({
          data: {
            actorId: resetRecord.user.id,
            action: "PASSWORD_RECOVERED",
            entityType: "AdminUser",
            entityId: resetRecord.user.id,
            description: "Admin password was reset through verified email recovery.",
          },
        }),
      ]);
    });
  } catch (error) {
    if (error?.message === "RESET_TOKEN_ALREADY_CONSUMED" || error?.message === "ADMIN_ACCOUNT_UNAVAILABLE") {
      return jsonError(INVALID_TOKEN_MESSAGE, 400, rateLimit.headers);
    }
    console.error("Admin password reset failed.", { cause: error?.message });
    return jsonError("Unable to reset the password. Please try again.", 500, rateLimit.headers);
  }

  after(async () => {
    try {
      await sendAdminPasswordChangedEmail({
        to: resetRecord.user.email,
        name: resetRecord.user.name,
      });
    } catch (error) {
      console.error("Admin password change notification failed.", { cause: error?.message });
    }
  });

  return NextResponse.json(
    { success: true, message: "Password reset successfully. You can now sign in." },
    { headers: { "Cache-Control": "no-store", ...rateLimit.headers } },
  );
}
