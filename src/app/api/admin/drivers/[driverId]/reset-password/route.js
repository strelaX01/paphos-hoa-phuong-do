import { prisma } from "@/lib/prisma";
import { driverAccountSelect, serializeDriverAccount } from "@/lib/driverAccountData";
import { generateTemporaryPassword, hashPassword } from "@/lib/driverCredentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request, context) {
  const { driverId } = await context.params;
  const temporaryPassword = generateTemporaryPassword();
  const temporaryPasswordHash = await hashPassword(temporaryPassword);

  try {
    const driver = await prisma.driverAccount.update({
      where: { id: driverId },
      data: {
        temporaryPasswordHash,
        mustChangePassword: true,
      },
      select: driverAccountSelect,
    });

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
