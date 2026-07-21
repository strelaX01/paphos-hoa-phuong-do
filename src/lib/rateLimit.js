const globalForRateLimit = globalThis;
const stores = globalForRateLimit.__rateLimitStores || new Map();

globalForRateLimit.__rateLimitStores = stores;

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return (request.headers.get("x-real-ip") || "unknown").trim().slice(0, 64);
}

export function checkRateLimit(request, { key, limit, windowMs }) {
  const now = Date.now();
  const storeKey = `${key}:${getClientIp(request)}`;
  const current = stores.get(storeKey);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;

  entry.count += 1;
  stores.set(storeKey, entry);

  if (stores.size > 1000) {
    for (const [candidateKey, candidate] of stores) {
      if (candidate.resetAt <= now) stores.delete(candidateKey);
    }
  }

  const remaining = Math.max(0, limit - entry.count);
  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return {
    allowed: entry.count <= limit,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
      ...(entry.count > limit ? { "Retry-After": String(retryAfter) } : {}),
    },
  };
}
