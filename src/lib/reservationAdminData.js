import { normalizeReservationStatus } from "@/lib/reservationStatus";

export const reservationAdminSelect = {
  id: true,
  customerName: true,
  email: true,
  phone: true,
  partySize: true,
  date: true,
  time: true,
  status: true,
  requests: true,
  internalNote: true,
  createdAt: true,
  updatedAt: true,
};

export function serializeAdminReservation(reservation) {
  return {
    id: reservation.id,
    name: reservation.customerName,
    email: reservation.email,
    phone: reservation.phone,
    guests: reservation.partySize,
    date: reservation.date.toISOString().slice(0, 10),
    time: reservation.time,
    status: normalizeReservationStatus(reservation.status),
    requests: reservation.requests || "",
    internalNote: reservation.internalNote || "",
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}
