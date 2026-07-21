import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "hpd_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

export const ADMIN_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE,
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function createSignature(encodedPayload) {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

export function createAdminSessionToken(adminUser) {
  const role = adminUser.role === "DRIVER" ? "DRIVER" : "ADMIN";
  const payload = Buffer.from(JSON.stringify({
    userId: adminUser.id,
    role,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE,
  })).toString("base64url");

  return `${payload}.${createSignature(payload)}`;
}

export function verifyAdminSessionToken(token) {
  try {
    const [payload, signature, ...extraParts] = String(token || "").split(".");
    if (!payload || !signature || extraParts.length > 0) return null;

    const expectedSignature = createSignature(payload);
    const suppliedBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");
    if (suppliedBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof session.userId !== "string" ||
      !["ADMIN", "DRIVER"].includes(session.role) ||
      !Number.isInteger(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
