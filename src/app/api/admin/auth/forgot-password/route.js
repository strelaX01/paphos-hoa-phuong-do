import { randomUUID } from "node:crypto";

import { after, NextResponse } from "next/server";

import { hasTrustedAdminOrigin } from "@/lib/adminApiAuth";
import { isAdminRecoveryEmailConfigured, sendAdminPasswordResetEmail } from "@/lib/adminRecoveryEmail";
import { getRecoveryEmailError, normalizeRecoveryEmail } from "@/lib/adminRecoveryValidation";
import { checkPasswordResetRequestRateLimit } from "@/lib/authRateLimit";
import {
  buildPasswordResetUrl,
  createPasswordResetToken,
  getPasswordResetExpiry,
  hashPasswordResetToken,
} from "@/lib/passwordResetToken";
import { prisma } from "@/lib/prisma";
import { readLimitedJson } from "@/lib/readLimitedJson";

const GENERIC_MESSAGE = "If an active admin account exists for this email, a reset link has been sent.";

function json(message, status = 200, headers = {}) {
  return NextResponse.json(
    status >= 400 ? { error: message } : { message },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export async function POST(request) {
  if (!hasTrustedAdminOrigin(request)) return json("Cross-site request blocked.", 403);

  const parsed = await readLimitedJson(request);
  if (parsed.error) return json(parsed.error, parsed.status);

  const email = normalizeRecoveryEmail(parsed.data?.email);
  const emailError = getRecoveryEmailError(email);
  if (emailError) return json(emailError, 422);
  if (!isAdminRecoveryEmailConfigured()) {
    return json("Password recovery is temporarily unavailable. Please contact the site operator.", 503);
  }

  const rateLimit = await checkPasswordResetRequestRateLimit(request, email);
  if (!rateLimit.allowed) {
    return json("Too many reset requests. Please try again later.", 429, rateLimit.headers);
  }

  const account = await prisma.adminUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: "ADMIN", status: "ACTIVE" },
    select: { id: true, name: true, email: true },
  });

  after(async () => {
    if (!account) return;
    try {
      const token = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(token);
      const resetUrl = buildPasswordResetUrl(token);
      const now = new Date();

      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: account.id, usedAt: null },
          data: { usedAt: now },
        }),
        prisma.passwordResetToken.create({
          data: {
            id: randomUUID(),
            userId: account.id,
            tokenHash,
            expiresAt: getPasswordResetExpiry(),
          },
        }),
        prisma.passwordResetToken.deleteMany({
          where: { expiresAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        }),
      ]);

      await sendAdminPasswordResetEmail({
        to: account.email,
        name: account.name,
        resetUrl,
      });
    } catch (error) {
      console.error("Admin password reset delivery failed.", { cause: error?.message });
    }
  });

  return json(GENERIC_MESSAGE, 202, rateLimit.headers);
}
