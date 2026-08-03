import { getCurrentAdminAccount } from "@/lib/adminAuth";
import { hasTrustedAdminOrigin } from "@/lib/adminRequestOrigin.mjs";

export { hasTrustedAdminOrigin } from "@/lib/adminRequestOrigin.mjs";

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
