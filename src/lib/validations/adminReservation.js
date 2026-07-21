const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]+$/;
const statuses = ["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export function validateAdminReservationInput(input) {
  const errors = {};
  const customerName = typeof input?.name === "string" ? input.name.trim() : "";
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input?.phone === "string" ? input.phone.trim() : "";
  const partySize = Number(input?.guests);
  const date = typeof input?.date === "string" ? input.date.trim() : "";
  const time = typeof input?.time === "string" ? input.time.trim() : "";
  const status = typeof input?.status === "string" ? input.status.trim().toUpperCase() : "";
  const requests = typeof input?.requests === "string" ? input.requests.trim() : "";
  const internalNote = typeof input?.internalNote === "string" ? input.internalNote.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");

  if (customerName.length < 2 || customerName.length > 100) errors.name = "Name must be between 2 and 100 characters.";
  if (!emailPattern.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
  if (!phonePattern.test(phone) || phone.length > 30 || phoneDigits.length < 6 || phoneDigits.length > 15) errors.phone = "Enter a valid phone number using 6 to 15 digits.";
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) errors.guests = "Party size must be between 1 and 20.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00.000Z`))) errors.date = "Enter a valid reservation date.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.time = "Enter a valid reservation time.";
  if (!statuses.includes(status)) errors.status = "Select a valid reservation status.";
  if (requests.length > 1000) errors.requests = "Special requests must be 1000 characters or fewer.";
  if (internalNote.length > 2000) errors.internalNote = "Internal note must be 2000 characters or fewer.";

  return {
    data: {
      customerName,
      email,
      phone,
      partySize,
      date: new Date(`${date}T12:00:00.000Z`),
      time,
      status,
      requests: requests || null,
      internalNote: internalNote || null,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
