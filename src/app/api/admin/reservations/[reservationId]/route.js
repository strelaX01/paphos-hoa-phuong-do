import { authorizeAdminRequest } from "@/lib/adminApiAuth";
import { prisma } from "@/lib/prisma";
import { reservationAdminSelect, serializeAdminReservation } from "@/lib/reservationAdminData";
import { validateAdminReservationInput } from "@/lib/validations/adminReservation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export async function PATCH(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { reservationId } = await context.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = typeof body?.status === "string" ? body.status.trim().toUpperCase() : "";
  const hasInternalNote = Object.prototype.hasOwnProperty.call(body || {}, "internalNote");
  const internalNote = typeof body?.internalNote === "string" ? body.internalNote.trim() : "";

  if (status && !STATUSES.includes(status)) return Response.json({ error: "Invalid reservation status." }, { status: 422 });
  if (hasInternalNote && typeof body.internalNote !== "string") return Response.json({ error: "Internal note must be text." }, { status: 422 });
  if (internalNote.length > 2000) return Response.json({ error: "Internal note must be 2000 characters or fewer." }, { status: 422 });
  if (!status && !hasInternalNote) return Response.json({ error: "Provide a status or internal note to update." }, { status: 422 });

  try {
    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        ...(status ? { status } : {}),
        ...(hasInternalNote ? { internalNote: internalNote || null } : {}),
      },
      select: reservationAdminSelect,
    });
    return Response.json({ data: serializeAdminReservation(reservation) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Reservation not found." }, { status: 404 });
    console.error("PATCH /api/admin/reservations/[reservationId]", error);
    return Response.json({ error: "Failed to update reservation." }, { status: 500 });
  }
}

export async function PUT(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { reservationId } = await context.params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validation = validateAdminReservationInput(body);
  if (!validation.isValid) return Response.json({ errors: validation.errors }, { status: 422 });

  try {
    const reservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: validation.data,
      select: reservationAdminSelect,
    });
    return Response.json({ data: serializeAdminReservation(reservation) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Reservation not found." }, { status: 404 });
    console.error("PUT /api/admin/reservations/[reservationId]", error);
    return Response.json({ error: "Failed to update reservation." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await authorizeAdminRequest(request);
  if (auth.response) return auth.response;
  const { reservationId } = await context.params;

  try {
    await prisma.reservation.delete({ where: { id: reservationId } });
    return Response.json({ data: { id: reservationId } });
  } catch (error) {
    if (error.code === "P2025") return Response.json({ error: "Reservation not found." }, { status: 404 });
    console.error("DELETE /api/admin/reservations/[reservationId]", error);
    return Response.json({ error: "Failed to delete reservation." }, { status: 500 });
  }
}
