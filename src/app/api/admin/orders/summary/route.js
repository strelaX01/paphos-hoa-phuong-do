import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await authorizeAdminRequest(request, { roles: ["ADMIN", "DRIVER"] });
  if (auth.response) return auth.response;
  const isDriver = auth.account.role === "DRIVER";

  try {
    const [pending, latest] = await prisma.$transaction([
      prisma.order.count({ where: { status: isDriver ? "PENDING_PICKUP" : "PENDING" } }),
      prisma.order.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);
    return Response.json({
      data: { pending, latestCreatedAt: latest?.createdAt.toISOString() || null },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/orders/summary", error);
    return Response.json({ error: "Failed to load order count." }, { status: 500 });
  }
}
