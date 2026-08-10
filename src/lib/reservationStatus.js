export const RESERVATION_STATUSES = Object.freeze([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
]);

const LEGACY_STATUS_MAP = Object.freeze({
  SEATED: "CONFIRMED",
  NO_SHOW: "CANCELLED",
});

export function normalizeReservationStatus(status) {
  return LEGACY_STATUS_MAP[status] || status;
}

export function reservationStatusFilter(status) {
  if (status === "CONFIRMED") return { in: ["CONFIRMED", "SEATED"] };
  if (status === "CANCELLED") return { in: ["CANCELLED", "NO_SHOW"] };
  return status;
}
