import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function getClientIp(request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  const vercelForwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelForwarded) return vercelForwarded.slice(0, 64);

  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);
  return (forwarded || "unknown").slice(0, 64);
}

function rateKey(namespace, value) {
  return `${namespace}:${digest(value)}`;
}

async function consume(key, limit, windowMs) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const [entry] = await prisma.$queryRaw`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "AuthRateLimit"."resetAt" <= ${now} THEN 1
        ELSE "AuthRateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "AuthRateLimit"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "AuthRateLimit"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `;

  if (Math.random() < 0.01) {
    await prisma.$executeRaw`DELETE FROM "AuthRateLimit" WHERE "resetAt" <= ${now}`;
  }

  return {
    allowed: entry.count <= limit,
    retryAfter: Math.max(1, Math.ceil((new Date(entry.resetAt).getTime() - now.getTime()) / 1000)),
  };
}

async function remove(keys) {
  if (!keys.length) return;
  await prisma.$executeRaw`
    DELETE FROM "AuthRateLimit" WHERE "key" IN (${keys[0]}, ${keys[1] || keys[0]})
  `;
}

function loginKeys(request, username) {
  return {
    ip: rateKey("login-ip", getClientIp(request)),
    username: username ? rateKey("login-user", username) : null,
  };
}

export async function checkLoginRateLimit(request, username) {
  const keys = loginKeys(request, username);
  const [ipResult, accountResult] = await Promise.all([
    consume(keys.ip, 20, LOGIN_WINDOW_MS),
    keys.username ? consume(keys.username, 5, LOGIN_WINDOW_MS) : Promise.resolve({ allowed: true, retryAfter: 0 }),
  ]);
  const allowed = ipResult.allowed && accountResult.allowed;
  const retryAfter = Math.max(ipResult.retryAfter, accountResult.retryAfter);
  return {
    allowed,
    headers: allowed ? {} : { "Retry-After": String(retryAfter) },
  };
}

export async function clearLoginRateLimit(request, username) {
  const keys = loginKeys(request, username);
  await remove([keys.ip, keys.username].filter(Boolean));
}

export async function checkAccountRateLimit(request, account, { limit = 5, windowMs = LOGIN_WINDOW_MS } = {}) {
  const key = rateKey(`account:${account.role}`, account.id);
  const result = await consume(key, limit, windowMs);
  return {
    allowed: result.allowed,
    headers: result.allowed ? {} : { "Retry-After": String(result.retryAfter) },
  };
}

export async function checkPasswordResetRequestRateLimit(request, email) {
  const clientIp = getClientIp(request);
  const results = await Promise.all([
    consume(rateKey("password-reset-request-ip", clientIp), 10, PASSWORD_RESET_WINDOW_MS),
    consume(rateKey("password-reset-request-email", email), 3, PASSWORD_RESET_WINDOW_MS),
    consume(rateKey("password-reset-request-daily-ip", clientIp), 50, PASSWORD_RESET_DAILY_WINDOW_MS),
    consume(rateKey("password-reset-request-daily-email", email), 10, PASSWORD_RESET_DAILY_WINDOW_MS),
  ]);
  const denied = results.filter((result) => !result.allowed);
  const allowed = denied.length === 0;
  return {
    allowed,
    headers: allowed
      ? {}
      : { "Retry-After": String(Math.max(...denied.map((result) => result.retryAfter))) },
  };
}

export async function checkPasswordResetAttemptRateLimit(request, tokenHash) {
  const [ipResult, tokenResult] = await Promise.all([
    consume(rateKey("password-reset-attempt-ip", getClientIp(request)), 20, PASSWORD_RESET_WINDOW_MS),
    tokenHash
      ? consume(rateKey("password-reset-attempt-token", tokenHash), 5, PASSWORD_RESET_WINDOW_MS)
      : Promise.resolve({ allowed: true, retryAfter: 0 }),
  ]);
  const allowed = ipResult.allowed && tokenResult.allowed;
  return {
    allowed,
    headers: allowed
      ? {}
      : { "Retry-After": String(Math.max(ipResult.retryAfter, tokenResult.retryAfter)) },
  };
}

export async function checkExternalApiRateLimit(request, { namespace, shortLimit, dailyIpLimit, dailyGlobalLimit }) {
  const clientIp = getClientIp(request)
  const results = await Promise.all([
    consume(rateKey(`${namespace}-short-ip`, clientIp), shortLimit, 15 * 60 * 1000),
    consume(rateKey(`${namespace}-daily-ip`, clientIp), dailyIpLimit, 24 * 60 * 60 * 1000),
    consume(rateKey(`${namespace}-daily-global`, "all"), dailyGlobalLimit, 24 * 60 * 60 * 1000),
  ])
  const denied = results.filter((result) => !result.allowed)
  return {
    allowed: denied.length === 0,
    headers: denied.length ? { "Retry-After": String(Math.max(...denied.map((result) => result.retryAfter))) } : {},
  }
}
