import { getCurrentAdminAccount } from "@/lib/adminAuth";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function hasTrustedAdminOrigin(request) {
  if (SAFE_METHODS.has(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function authError(error, status, code) {
  return Response.json(
    { error, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function authorizeAdminRequest(
  request,
  { roles = ["ADMIN"], allowTemporaryPassword = false } = {},
) {
  if (!hasTrustedAdminOrigin(request)) {
    return { response: authError("Cross-site request blocked.", 403, "ORIGIN_REJECTED") };
  }

  const account = await getCurrentAdminAccount();
  if (!account) {
    return { response: authError("Authentication required.", 401, "AUTH_REQUIRED") };
  }
  if (!roles.includes(account.role)) {
    return { response: authError("You do not have permission to perform this action.", 403, "FORBIDDEN") };
  }
  if (account.mustChangePassword && !allowTemporaryPassword) {
    return { response: authError("Password change required.", 428, "PASSWORD_CHANGE_REQUIRED") };
  }

  return { account };
}
