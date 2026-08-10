import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { readAdminJson } from "@/lib/adminJsonRequest";
import { prisma } from "@/lib/prisma";
import { driverAccountSelect, serializeDriverAccount } from "@/lib/driverAccountData";
import { generateTemporaryPassword, getTemporaryPasswordExpiry, hashPassword } from "@/lib/driverCredentials";
import { validateDriverAccountInput } from "@/lib/validations/driverAccount";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
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
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const parsed = await readAdminJson(request);
  if (parsed.response) return parsed.response;
  const body = parsed.data;

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
        temporaryPasswordExpiresAt: getTemporaryPasswordExpiry(),
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
