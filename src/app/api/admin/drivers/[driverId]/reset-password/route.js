import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { revokeAccountSessions } from "@/lib/adminSessionStore";
import { prisma } from "@/lib/prisma";
import { driverAccountSelect, serializeDriverAccount } from "@/lib/driverAccountData";
import { generateTemporaryPassword, getTemporaryPasswordExpiry, hashPassword } from "@/lib/driverCredentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { driverId } = await context.params;
  const temporaryPassword = generateTemporaryPassword();
  const temporaryPasswordHash = await hashPassword(temporaryPassword);

  try {
    const driver = await prisma.driverAccount.update({
      where: { id: driverId },
      data: {
        passwordHash: null,
        temporaryPasswordHash,
        temporaryPasswordExpiresAt: getTemporaryPasswordExpiry(),
        mustChangePassword: true,
      },
      select: driverAccountSelect,
    });
    await revokeAccountSessions(driver.id, "DRIVER");

    return Response.json({
      data: serializeDriverAccount(driver),
      credential: { username: driver.username, temporaryPassword },
    });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Driver account not found." }, { status: 404 });
    console.error("POST /api/admin/drivers/[driverId]/reset-password", error);
    return Response.json({ error: "Failed to reset driver password." }, { status: 500 });
  }
}
