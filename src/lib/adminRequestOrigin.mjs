const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizedOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim();
}

function forwardedOrigin(request) {
  const host = firstHeaderValue(
    request.headers.get('x-forwarded-host') || request.headers.get('host'),
  );
  if (!host || /[\\/@\s]/.test(host)) return null;

  const requestProtocol = normalizedOrigin(request.url)?.split(':')[0];
  const protocol = firstHeaderValue(request.headers.get('x-forwarded-proto')) || requestProtocol;
  if (!['http', 'https'].includes(protocol)) return null;
  return normalizedOrigin(`${protocol}://${host}`);
}

function trustedOrigins(request) {
  const origins = new Set();
  const candidates = [
    request.url,
    forwardedOrigin(request),
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    ...String(process.env.ADMIN_ALLOWED_ORIGINS || '').split(','),
  ];

  for (const candidate of candidates) {
    const origin = normalizedOrigin(String(candidate || '').trim());
    if (origin) origins.add(origin);
  }
  return origins;
}

export function hasTrustedAdminOrigin(request) {
  if (SAFE_METHODS.has(request.method)) return true;
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  const normalized = normalizedOrigin(origin);
  return Boolean(normalized && trustedOrigins(request).has(normalized));
}
