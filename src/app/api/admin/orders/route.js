import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { cyprusMidnightUtc, getCyprusDayRange, shiftDateKey } from "@/lib/cyprusTime";
import { orderAdminSelect, orderDriverSelect, serializeAdminOrder, serializeDriverOrder } from "@/lib/orderAdminData";
import { DRIVER_ORDER_STATUSES, ORDER_STATUSES } from "@/lib/orderStatus";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

const LIVE_STATUSES = ["PENDING", "PREPARING", "PENDING_PICKUP", "EN_ROUTE"];
const HISTORY_STATUSES = ["DELIVERED", "CANCELLED"];
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDateKey(value) {
  if (!DATE_KEY_PATTERN.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export async function GET(request) {
  const auth = await authorizeAdminRequest(request, { roles: ["ADMIN", "DRIVER"] });
  if (auth.response) return auth.response;
  const isDriver = auth.account.role === "DRIVER";
  const { searchParams } = new URL(request.url);

  const page = positiveInteger(searchParams.get("page"), 1, 100000);
  const limit = positiveInteger(searchParams.get("limit"), 12, 100);
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const requestedScope = (searchParams.get("scope") || "live").trim().toLowerCase();
  if (!isDriver && !["live", "history"].includes(requestedScope)) return Response.json({ error: "Invalid order scope." }, { status: 422 });
  const scope = isDriver ? "live" : requestedScope;
  const scopeStatuses = isDriver ? ["PENDING_PICKUP", "EN_ROUTE"] : scope === "history" ? HISTORY_STATUSES : LIVE_STATUSES;
  const status = (searchParams.get("status") || "").trim().toUpperCase();
  const allowedFilterStatuses = isDriver ? DRIVER_ORDER_STATUSES : ORDER_STATUSES;
  if (status && (!allowedFilterStatuses.includes(status) || !scopeStatuses.includes(status))) return Response.json({ error: "Invalid order status for this view." }, { status: 422 });
  const from = (searchParams.get("from") || "").trim();
  const to = (searchParams.get("to") || "").trim();
  if ((from && !validDateKey(from)) || (to && !validDateKey(to)) || (from && to && from > to)) return Response.json({ error: "Invalid order date range." }, { status: 422 });

  const where = {
    status: status || { in: scopeStatuses },
    ...(scope === "history" && (from || to) ? { createdAt: { ...(from ? { gte: cyprusMidnightUtc(from) } : {}), ...(to ? { lt: cyprusMidnightUtc(shiftDateKey(to, 1)) } : {}) } } : {}),
    ...(query ? {
      OR: [
        { orderNumber: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } },
        { customerPhone: { contains: query, mode: "insensitive" } },
        { deliveryStreet: { contains: query, mode: "insensitive" } },
      ],
    } : {}),
  };

  try {
    const today = getCyprusDayRange();
    const [orders, total, metrics] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: scope === "live" ? [{ status: "asc" }, { createdAt: "asc" }] : { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: isDriver ? orderDriverSelect : orderAdminSelect,
      }),
      prisma.order.count({ where }),
      prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE "status" = CAST('PENDING' AS "OrderStatus"))::int AS "pending",
          COUNT(*) FILTER (WHERE "status" IN (CAST('PREPARING' AS "OrderStatus"), CAST('PENDING_PICKUP' AS "OrderStatus")))::int AS "kitchen",
          COUNT(*) FILTER (WHERE "status" = CAST('EN_ROUTE' AS "OrderStatus"))::int AS "delivery",
          COUNT(*) FILTER (WHERE "status" = CAST('PENDING_PICKUP' AS "OrderStatus"))::int AS "ready",
          COALESCE(SUM("total") FILTER (
            WHERE "createdAt" >= ${today.gte}
              AND "createdAt" < ${today.lt}
              AND "status" <> CAST('CANCELLED' AS "OrderStatus")
          ), 0) AS "todayRevenue"
        FROM "Order"
      `,
    ]);
    const summary = metrics[0];

    return Response.json({
      data: orders.map(isDriver ? serializeDriverOrder : serializeAdminOrder),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: { pending: summary.pending, kitchen: summary.kitchen, delivery: summary.delivery, ready: summary.ready, ...(isDriver ? {} : { todayRevenue: Number(summary.todayRevenue) }) },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/orders", error);
    return Response.json({ error: "Failed to load orders." }, { status: 500 });
  }
}
