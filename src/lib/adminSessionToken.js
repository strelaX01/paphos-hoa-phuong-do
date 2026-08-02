import { createHmac, randomBytes } from "node:crypto";

export const ADMIN_SESSION_COOKIE = process.env.NODE_ENV === "production"
  ? "__Host-hpd_session"
  : "hpd_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;
export const ADMIN_SESSION_IDLE_SECONDS = 30 * 60;

export const ADMIN_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ADMIN_SESSION_MAX_AGE,
  priority: "high",
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  const unsafeValues = new Set([
    "REPLACE_WITH_A_LONG_RANDOM_SECRET",
    "CHANGE_ME",
    "YOUR_SECRET_HERE",
  ]);
  if (!secret || secret.length < 32 || unsafeValues.has(secret)) {
    throw new Error("SESSION_SECRET must be a unique random value containing at least 32 characters.");
  }
  return secret;
}

function createSignature(encodedPayload) {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

export function createAdminSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAdminSessionToken(token) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(String(token || ""))) return null;
  return createSignature(token);
}
