import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await authorizeAdminRequest(request, { roles: ["ADMIN", "DRIVER"] });
  if (auth.response) return auth.response;
  const isDriver = auth.account.role === "DRIVER";

  try {
    const pendingStatus = isDriver ? "PENDING_PICKUP" : "PENDING";
    const [summary] = isDriver
      ? await prisma.$queryRaw`
          SELECT
            COUNT(*) FILTER (WHERE "status" = CAST(${pendingStatus} AS "OrderStatus"))::int AS "pendingOrders",
            MAX("createdAt") AS "latestOrderCreatedAt",
            0::int AS "pendingReservations",
            NULL::timestamp AS "latestReservationCreatedAt"
          FROM "Order"
        `
      : await prisma.$queryRaw`
          SELECT
            (SELECT COUNT(*)::int FROM "Order" WHERE "status" = CAST(${pendingStatus} AS "OrderStatus")) AS "pendingOrders",
            (SELECT MAX("createdAt") FROM "Order") AS "latestOrderCreatedAt",
            (SELECT COUNT(*)::int FROM "Reservation" WHERE "status" = CAST('PENDING' AS "ReservationStatus")) AS "pendingReservations",
            (SELECT MAX("createdAt") FROM "Reservation") AS "latestReservationCreatedAt"
        `;
    return Response.json({
      data: {
        pending: summary.pendingOrders,
        latestCreatedAt: summary.latestOrderCreatedAt?.toISOString() || null,
        pendingReservations: summary.pendingReservations,
        latestReservationCreatedAt: summary.latestReservationCreatedAt?.toISOString() || null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/orders/summary", error);
    return Response.json({ error: "Failed to load order count." }, { status: 500 });
  }
}
