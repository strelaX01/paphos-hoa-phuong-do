import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_IDLE_SECONDS,
  ADMIN_SESSION_MAX_AGE,
  createAdminSessionToken,
  hashAdminSessionToken,
} from "@/lib/adminSessionToken";

const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export async function createStoredAdminSession(account) {
  const token = createAdminSessionToken();
  const tokenHash = hashAdminSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_MAX_AGE * 1000);

  await prisma.$executeRaw`
    INSERT INTO "AdminSession"
      ("id", "tokenHash", "userId", "role", "expiresAt", "lastSeenAt", "createdAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${tokenHash}, ${account.id}, CAST(${account.role} AS "UserRole"), ${expiresAt}, ${now}, ${now}, ${now})
  `;

  if (Math.random() < 0.01) {
    const retentionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    await prisma.$executeRaw`
      DELETE FROM "AdminSession"
      WHERE "expiresAt" <= ${retentionCutoff}
         OR "revokedAt" <= ${retentionCutoff}
    `;
  }

  return token;
}

export async function getStoredAdminSession(token, { touch = true } = {}) {
  const tokenHash = hashAdminSessionToken(token);
  if (!tokenHash) return null;

  const [session] = await prisma.$queryRaw`
    SELECT "id", "userId", "role", "expiresAt", "lastSeenAt", "revokedAt"
    FROM "AdminSession"
    WHERE "tokenHash" = ${tokenHash}
    LIMIT 1
  `;
  if (!session || session.revokedAt) return null;

  const now = new Date();
  const idleDeadline = new Date(session.lastSeenAt).getTime() + ADMIN_SESSION_IDLE_SECONDS * 1000;
  if (new Date(session.expiresAt) <= now || idleDeadline <= now.getTime()) {
    await prisma.$executeRaw`
      UPDATE "AdminSession" SET "revokedAt" = ${now}, "updatedAt" = ${now}
      WHERE "id" = ${session.id} AND "revokedAt" IS NULL
    `;
    return null;
  }

  if (touch && now.getTime() - new Date(session.lastSeenAt).getTime() >= TOUCH_INTERVAL_MS) {
    await prisma.$executeRaw`
      UPDATE "AdminSession" SET "lastSeenAt" = ${now}, "updatedAt" = ${now}
      WHERE "id" = ${session.id} AND "revokedAt" IS NULL
    `;
  }

  return {
    id: session.id,
    userId: session.userId,
    role: session.role,
    expiresAt: new Date(session.expiresAt),
  };
}

export async function revokeStoredAdminSession(token) {
  const tokenHash = hashAdminSessionToken(token);
  if (!tokenHash) return;
  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "AdminSession" SET "revokedAt" = ${now}, "updatedAt" = ${now}
    WHERE "tokenHash" = ${tokenHash} AND "revokedAt" IS NULL
  `;
}

export async function revokeAccountSessions(userId, role) {
  const now = new Date();
  await prisma.$executeRaw`
    UPDATE "AdminSession" SET "revokedAt" = ${now}, "updatedAt" = ${now}
    WHERE "userId" = ${userId}
      AND "role" = CAST(${role} AS "UserRole")
      AND "revokedAt" IS NULL
  `;
}
