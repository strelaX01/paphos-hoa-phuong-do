import { createHmac, randomBytes, randomUUID } from "node:crypto";

import pg from "pg";

const { Client } = pg;
const username = process.argv[2]?.trim().toLowerCase();
const confirmed = process.argv.includes("--confirm=RESET-ADMIN");

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!username || !/^[a-z0-9_-]{3,32}$/.test(username)) {
  fail("Usage: npm run admin:recover -- <username> --confirm=RESET-ADMIN");
} else if (!confirmed) {
  fail("Recovery not confirmed. Add --confirm=RESET-ADMIN after the username.");
} else if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET || !process.env.APP_URL) {
  fail("DATABASE_URL, SESSION_SECRET, and APP_URL are required.");
} else if (process.env.SESSION_SECRET.length < 32) {
  fail("SESSION_SECRET must contain at least 32 characters.");
} else {
  const appUrl = new URL(process.env.APP_URL);
  if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost" && appUrl.hostname !== "127.0.0.1") {
    fail("APP_URL must use HTTPS unless it points to localhost.");
  } else {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await client.connect();
      const accountResult = await client.query(
        `SELECT "id" FROM "AdminUser" WHERE "username" = $1 AND "role" = 'ADMIN' AND "status" = 'ACTIVE' LIMIT 1`,
        [username],
      );
      const account = accountResult.rows[0];
      if (!account) throw new Error("No active admin account was found for that username.");

      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHmac("sha256", process.env.SESSION_SECRET)
        .update(`password-reset:${token}`)
        .digest("hex");
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

      await client.query("BEGIN");
      await client.query(
        `UPDATE "PasswordResetToken" SET "usedAt" = $1 WHERE "userId" = $2 AND "usedAt" IS NULL`,
        [now, account.id],
      );
      await client.query(
        `INSERT INTO "PasswordResetToken" ("id", "tokenHash", "userId", "expiresAt", "createdAt") VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), tokenHash, account.id, expiresAt, now],
      );
      await client.query(
        `INSERT INTO "AuditLog" ("id", "action", "entityType", "entityId", "description", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), "PASSWORD_RECOVERY_ISSUED", "AdminUser", account.id, "Emergency password recovery link issued from the server CLI.", now],
      );
      await client.query("COMMIT");

      appUrl.pathname = "/admin/reset-password";
      appUrl.search = "";
      appUrl.hash = `token=${token}`;
      console.log("Emergency reset link (valid for 15 minutes, one use):");
      console.log(appUrl.toString());
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      fail(error.message || "Admin recovery failed.");
    } finally {
      await client.end().catch(() => {});
    }
  }
}
