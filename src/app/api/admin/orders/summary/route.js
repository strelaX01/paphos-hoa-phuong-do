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
            (ARRAY_AGG("id" ORDER BY "createdAt" DESC))[1] AS "latestOrderId",
            0::int AS "pendingReservations",
            NULL::timestamp AS "latestReservationCreatedAt",
            NULL::text AS "latestReservationId"
          FROM "Order"
        `
      : await prisma.$queryRaw`
          WITH "orderSummary" AS (
            SELECT
              COUNT(*) FILTER (WHERE "status" = CAST(${pendingStatus} AS "OrderStatus"))::int AS "pendingOrders",
              MAX("createdAt") AS "latestOrderCreatedAt",
              (ARRAY_AGG("id" ORDER BY "createdAt" DESC))[1] AS "latestOrderId"
            FROM "Order"
          ),
          "reservationSummary" AS (
            SELECT
              COUNT(*) FILTER (WHERE "status" = CAST('PENDING' AS "ReservationStatus"))::int AS "pendingReservations",
              MAX("createdAt") AS "latestReservationCreatedAt",
              (ARRAY_AGG("id" ORDER BY "createdAt" DESC))[1] AS "latestReservationId"
            FROM "Reservation"
          )
          SELECT * FROM "orderSummary" CROSS JOIN "reservationSummary"
        `;
    return Response.json({
      data: {
        pending: summary.pendingOrders,
        latestId: summary.latestOrderId || null,
        latestCreatedAt: summary.latestOrderCreatedAt?.toISOString() || null,
        pendingReservations: summary.pendingReservations,
        latestReservationId: summary.latestReservationId || null,
        latestReservationCreatedAt: summary.latestReservationCreatedAt?.toISOString() || null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/orders/summary", error);
    return Response.json({ error: "Failed to load order count." }, { status: 500 });
  }
}
