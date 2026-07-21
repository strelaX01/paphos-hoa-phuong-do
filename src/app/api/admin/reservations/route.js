import { prisma } from "@/lib/prisma";
import { reservationAdminSelect, serializeAdminReservation } from "@/lib/reservationAdminData";
import { validateAdminReservationInput } from "@/lib/validations/adminReservation";

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
  const { searchParams } = new URL(request.url);

  if (searchParams.get("summaryOnly") === "1") {
    try {
      const [pending, latest] = await prisma.$transaction([
        prisma.reservation.count({ where: { status: "PENDING" } }),
        prisma.reservation.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      ]);
      return Response.json({
        data: { pending, latestCreatedAt: latest?.createdAt.toISOString() || null },
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("GET /api/admin/reservations summary", error);
      return Response.json({ error: "Failed to load reservation count." }, { status: 500 });
    }
  }

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

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const status = typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
  const hasInternalNote = Object.prototype.hasOwnProperty.call(body || {}, "internalNote");
  const internalNote = typeof body?.internalNote === "string" ? body.internalNote.trim() : "";

  if (!id) return Response.json({ error: "Reservation ID is required." }, { status: 422 });
  if (status && !STATUSES.includes(status)) return Response.json({ error: "Invalid reservation status." }, { status: 422 });
  if (hasInternalNote && typeof body.internalNote !== "string") return Response.json({ error: "Internal note must be text." }, { status: 422 });
  if (internalNote.length > 2000) return Response.json({ error: "Internal note must be 2000 characters or fewer." }, { status: 422 });
  if (!status && !hasInternalNote) return Response.json({ error: "Provide a status or internal note to update." }, { status: 422 });

  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(hasInternalNote ? { internalNote: internalNote || null } : {}),
      },
      select: reservationAdminSelect,
    });
    return Response.json({ data: serializeAdminReservation(reservation) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Reservation not found." }, { status: 404 });
    console.error("PATCH /api/admin/reservations", error);
    return Response.json({ error: "Failed to update reservation." }, { status: 500 });
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
  if (!id) return Response.json({ error: "Reservation ID is required." }, { status: 422 });

  const validation = validateAdminReservationInput(body);
  if (!validation.isValid) return Response.json({ errors: validation.errors }, { status: 422 });

  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: validation.data,
      select: reservationAdminSelect,
    });
    return Response.json({ data: serializeAdminReservation(reservation) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Reservation not found." }, { status: 404 });
    console.error("PUT /api/admin/reservations", error);
    return Response.json({ error: "Failed to update reservation." }, { status: 500 });
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
  if (!id) return Response.json({ error: "Reservation ID is required." }, { status: 422 });

  try {
    await prisma.reservation.delete({ where: { id } });
    return Response.json({ data: { id } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Reservation not found." }, { status: 404 });
    console.error("DELETE /api/admin/reservations", error);
    return Response.json({ error: "Failed to delete reservation." }, { status: 500 });
  }
}
