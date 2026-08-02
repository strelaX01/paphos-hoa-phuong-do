import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { revokeAccountSessions } from "@/lib/adminSessionStore";
import { prisma } from "@/lib/prisma";
import { driverAccountSelect, serializeDriverAccount } from "@/lib/driverAccountData";

export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { driverId } = await context.params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    return Response.json({ error: "Status must be ACTIVE or INACTIVE." }, { status: 422 });
  }

  try {
    const driver = await prisma.driverAccount.update({
      where: { id: driverId },
      data: { status },
      select: driverAccountSelect,
    });
    if (status === "INACTIVE") await revokeAccountSessions(driver.id, "DRIVER");
    return Response.json({ data: serializeDriverAccount(driver) });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Driver account not found." }, { status: 404 });
    console.error("PATCH /api/admin/drivers/[driverId]", error);
    return Response.json({ error: "Failed to update driver account." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { driverId } = await context.params;
  try {
    await revokeAccountSessions(driverId, "DRIVER");
    await prisma.driverAccount.delete({ where: { id: driverId } });
    return Response.json({ data: { id: driverId } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Driver account not found." }, { status: 404 });
    console.error("DELETE /api/admin/drivers/[driverId]", error);
    return Response.json({ error: "Failed to delete driver account." }, { status: 500 });
  }
}
