import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { orderAdminSelect, orderDriverSelect, serializeAdminOrder, serializeDriverOrder } from "@/lib/orderAdminData";
import { DRIVER_ORDER_STATUSES, ORDER_STATUSES } from "@/lib/orderStatus";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function cyprusDayRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Nicosia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const read = (type) => parts.find((part) => part.type === type)?.value;
  const start = new Date(`${read("year")}-${read("month")}-${read("day")}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

export async function GET(request) {
  const auth = await authorizeAdminRequest(request, { roles: ["ADMIN", "DRIVER"] });
  if (auth.response) return auth.response;
  const isDriver = auth.account.role === "DRIVER";
  const { searchParams } = new URL(request.url);

  const page = positiveInteger(searchParams.get("page"), 1, 100000);
  const limit = positiveInteger(searchParams.get("limit"), 12, 100);
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const status = (searchParams.get("status") || "").trim().toUpperCase();
  const allowedFilterStatuses = isDriver ? DRIVER_ORDER_STATUSES : ORDER_STATUSES;
  if (status && !allowedFilterStatuses.includes(status)) return Response.json({ error: "Invalid order status." }, { status: 422 });

  const where = {
    ...(isDriver ? { status: { in: DRIVER_ORDER_STATUSES } } : {}),
    ...(status ? { status } : {}),
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
    const today = cyprusDayRange();
    const [orders, total, pending, kitchen, delivery, ready] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: isDriver ? orderDriverSelect : orderAdminSelect,
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: { in: ["PREPARING", "PENDING_PICKUP"] } } }),
      prisma.order.count({ where: { status: "EN_ROUTE" } }),
      prisma.order.count({ where: { status: "PENDING_PICKUP" } }),
    ]);
    const todayRevenue = isDriver
      ? 0
      : Number((await prisma.order.aggregate({
        where: { createdAt: today, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }))._sum.total || 0);

    return Response.json({
      data: orders.map(isDriver ? serializeDriverOrder : serializeAdminOrder),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: { pending, kitchen, delivery, ready, ...(isDriver ? {} : { todayRevenue }) },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/orders", error);
    return Response.json({ error: "Failed to load orders." }, { status: 500 });
  }
}
