import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateReservationInput } from "@/lib/validations/reservation";
import { getRestaurantProfileData } from "@/lib/restaurantProfileData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { key: "public-reservation", limit: 5, windowMs: 15 * 60 * 1000 };

function json(payload, status, rateHeaders) {
  return Response.json(payload, {
    status,
    headers: { ...rateHeaders, "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  const rate = checkRateLimit(request, RATE_LIMIT);
  if (!rate.allowed) {
    return json({ error: "Too many reservation attempts. Please try again later." }, 429, rate.headers);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 16 * 1024) return json({ error: "Request body is too large." }, 413, rate.headers);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400, rate.headers);
  }

  if (typeof body?.website === "string" && body.website.trim()) {
    return json({ data: { reference: "RECEIVED", status: "PENDING" } }, 201, rate.headers);
  }

  const { openingHours } = await getRestaurantProfileData();
  const validation = validateReservationInput(body, { openingHours });
  if (!validation.isValid) return json({ errors: validation.errors }, 422, rate.headers);

  try {
    const duplicateSince = new Date(Date.now() - 10 * 60 * 1000);
    const duplicate = await prisma.reservation.findFirst({
      where: {
        date: validation.data.date,
        time: validation.data.time,
        createdAt: { gte: duplicateSince },
        OR: [
          { email: validation.data.email },
          { phone: validation.data.phone },
        ],
      },
      select: { id: true },
    });

    if (duplicate) {
      return json({ error: "This reservation request was already received." }, 409, rate.headers);
    }

    const reservation = await prisma.reservation.create({
      data: validation.data,
      select: { id: true, status: true },
    });

    return json({
      data: {
        reference: reservation.id.slice(-8).toUpperCase(),
        status: reservation.status,
      },
    }, 201, rate.headers);
  } catch (error) {
    console.error("POST /api/reservations", error);
    return json({ error: "Could not create the reservation. Please call the restaurant or try again." }, 500, rate.headers);
  }
}
