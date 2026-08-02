import { createHmac, randomBytes } from "node:crypto";

export const PASSWORD_RESET_LIFETIME_MINUTES = 15;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

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

export function createPasswordResetToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token) {
  if (!TOKEN_PATTERN.test(String(token || ""))) return null;
  return createHmac("sha256", getSessionSecret())
    .update(`password-reset:${token}`)
    .digest("hex");
}

export function getPasswordResetExpiry() {
  return new Date(Date.now() + PASSWORD_RESET_LIFETIME_MINUTES * 60 * 1000);
}

export function buildPasswordResetUrl(token) {
  const configuredOrigin = process.env.APP_URL?.trim();
  if (!configuredOrigin) throw new Error("APP_URL is required for password recovery.");

  const origin = new URL(configuredOrigin);
  if (process.env.NODE_ENV === "production" && origin.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS in production.");
  }
  if (!TOKEN_PATTERN.test(String(token || ""))) throw new Error("Invalid password reset token.");

  origin.pathname = "/admin/reset-password";
  origin.search = "";
  origin.hash = `token=${token}`;
  return origin.toString();
}
