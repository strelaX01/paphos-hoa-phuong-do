import { prisma } from "@/lib/prisma";
import { checkPublicWriteRateLimit } from "@/lib/authRateLimit";
import { readLimitedJson } from "@/lib/readLimitedJson";
import { validateReservationInput } from "@/lib/validations/reservation";
import { getRestaurantProfileData } from "@/lib/restaurantProfileData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { namespace: "public-reservation", limit: 5, windowMs: 15 * 60 * 1000 };
const MAX_BODY_BYTES = 16 * 1024;
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

function json(payload, status, rateHeaders) {
  return Response.json(payload, {
    status,
    headers: { ...rateHeaders, "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  const rate = await checkPublicWriteRateLimit(request, RATE_LIMIT);
  if (!rate.allowed) {
    return json({ error: "Too many reservation attempts. Please try again later." }, 429, rate.headers);
  }

  const parsed = await readLimitedJson(request, MAX_BODY_BYTES);
  if (parsed.error) return json({ error: parsed.error }, parsed.status, rate.headers);
  const body = parsed.data;
  const idempotencyKey = (request.headers.get("idempotency-key") || "").trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return json({ error: "A valid idempotency key is required." }, 400, rate.headers);
  }

  if (typeof body?.website === "string" && body.website.trim()) {
    return json({ data: { reference: "RECEIVED", status: "PENDING" } }, 201, rate.headers);
  }

  try {
    const existingRequest = await prisma.reservation.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    });
    if (existingRequest) {
      return json({ data: { reference: existingRequest.id.slice(-8).toUpperCase(), status: existingRequest.status, duplicate: true } }, 200, rate.headers);
    }
  } catch (error) {
    console.error("Failed to check reservation idempotency", error);
    return json({ error: "Could not verify this reservation request. Please try again." }, 503, rate.headers);
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
      data: { ...validation.data, idempotencyKey },
      select: { id: true, status: true },
    });

    return json({
      data: {
        reference: reservation.id.slice(-8).toUpperCase(),
        status: reservation.status,
      },
    }, 201, rate.headers);
  } catch (error) {
    if (error.code === "P2002") {
      const existing = await prisma.reservation.findUnique({
        where: { idempotencyKey },
        select: { id: true, status: true },
      });
      if (existing) {
        return json({ data: { reference: existing.id.slice(-8).toUpperCase(), status: existing.status, duplicate: true } }, 200, rate.headers);
      }
    }
    console.error("POST /api/reservations", error);
    return json({ error: "Could not create the reservation. Please call the restaurant or try again." }, 500, rate.headers);
  }
}
