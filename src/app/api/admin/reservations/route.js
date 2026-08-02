import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";
import { reservationAdminSelect, serializeAdminReservation } from "@/lib/reservationAdminData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"];

function readPositiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function getCyprusDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Nicosia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

function dateRange(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

export async function GET(request) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { searchParams } = new URL(request.url);

  const page = readPositiveInteger(searchParams.get("page"), 1, 100000);
  const limit = readPositiveInteger(searchParams.get("limit"), 12, 100);
  const query = (searchParams.get("q") || "").trim().slice(0, 100);
  const status = (searchParams.get("status") || "").trim().toUpperCase();
  const date = (searchParams.get("date") || "").trim();

  if (status && !STATUSES.includes(status)) {
    return Response.json({ error: "Invalid reservation status." }, { status: 422 });
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Date must use YYYY-MM-DD format." }, { status: 422 });
  }

  const where = {
    ...(status ? { status } : {}),
    ...(date ? { date: dateRange(date) } : {}),
    ...(query ? {
      OR: [
        { customerName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
      ],
    } : {}),
  };

  try {
    const todayRange = dateRange(getCyprusDate());
    const [reservations, total, todayBookings, todaySeats, confirmed, pending] = await prisma.$transaction([
      prisma.reservation.findMany({
        where,
        orderBy: [{ status: "asc" }, { date: "asc" }, { time: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: reservationAdminSelect,
      }),
      prisma.reservation.count({ where }),
      prisma.reservation.count({ where: { date: todayRange } }),
      prisma.reservation.aggregate({ where: { date: todayRange }, _sum: { partySize: true } }),
      prisma.reservation.count({ where: { status: "CONFIRMED" } }),
      prisma.reservation.count({ where: { status: "PENDING" } }),
    ]);

    return Response.json({
      data: reservations.map(serializeAdminReservation),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      summary: {
        todayBookings,
        todaySeats: todaySeats._sum.partySize || 0,
        confirmed,
        pending,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/reservations", error);
    return Response.json({ error: "Failed to load reservations." }, { status: 500 });
  }
}
