import { prisma } from "@/lib/prisma";
import { driverAccountSelect, serializeDriverAccount } from "@/lib/driverAccountData";
import { generateTemporaryPassword, hashPassword } from "@/lib/driverCredentials";
import { validateDriverAccountInput } from "@/lib/validations/driverAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const drivers = await prisma.driverAccount.findMany({
      orderBy: { createdAt: "desc" },
      select: driverAccountSelect,
    });
    return Response.json({ data: drivers.map(serializeDriverAccount) });
  } catch (error) {
    console.error("GET /api/admin/drivers", error);
    return Response.json({ error: "Failed to load driver accounts." }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateDriverAccountInput(body);
  if (!validation.isValid) return Response.json({ errors: validation.errors }, { status: 422 });

  const temporaryPassword = generateTemporaryPassword();
  const temporaryPasswordHash = await hashPassword(temporaryPassword);

  try {
    const [adminWithUsername] = await prisma.$queryRaw`
      SELECT "id" FROM "AdminUser" WHERE "username" = ${validation.data.username} LIMIT 1
    `;
    if (adminWithUsername) {
      return Response.json({ errors: { username: "This username is already used." } }, { status: 409 });
    }
    const driver = await prisma.driverAccount.create({
      data: {
        ...validation.data,
        temporaryPasswordHash,
        mustChangePassword: true,
      },
      select: driverAccountSelect,
    });

    return Response.json({
      data: serializeDriverAccount(driver),
      credential: { username: driver.username, temporaryPassword },
    }, { status: 201 });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json({ errors: { username: "This username is already used." } }, { status: 409 });
    }
    console.error("POST /api/admin/drivers", error);
    return Response.json({ error: "Failed to create driver account." }, { status: 500 });
  }
}

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const status = typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
  if (!id) return Response.json({ error: "Driver ID is required." }, { status: 422 });
  if (!["ACTIVE", "INACTIVE"].includes(status)) return Response.json({ error: "Status must be ACTIVE or INACTIVE." }, { status: 422 });

  try {
    const driver = await prisma.driverAccount.update({
      where: { id },
      data: { status },
      select: driverAccountSelect,
    });
    return Response.json({ data: serializeDriverAccount(driver) });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Driver account not found." }, { status: 404 });
    console.error("PATCH /api/admin/drivers", error);
    return Response.json({ error: "Failed to update driver account." }, { status: 500 });
  }
}

export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return Response.json({ error: "Driver ID is required." }, { status: 422 });

  const temporaryPassword = generateTemporaryPassword();
  const temporaryPasswordHash = await hashPassword(temporaryPassword);
  try {
    const driver = await prisma.driverAccount.update({
      where: { id },
      data: { temporaryPasswordHash, mustChangePassword: true },
      select: driverAccountSelect,
    });
    return Response.json({
      data: serializeDriverAccount(driver),
      credential: { username: driver.username, temporaryPassword },
    });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Driver account not found." }, { status: 404 });
    console.error("PUT /api/admin/drivers", error);
    return Response.json({ error: "Failed to reset driver password." }, { status: 500 });
  }
}

export async function DELETE(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return Response.json({ error: "Driver ID is required." }, { status: 422 });

  try {
    await prisma.driverAccount.delete({ where: { id } });
    return Response.json({ data: { id } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Driver account not found." }, { status: 404 });
    console.error("DELETE /api/admin/drivers", error);
    return Response.json({ error: "Failed to delete driver account." }, { status: 500 });
  }
}
