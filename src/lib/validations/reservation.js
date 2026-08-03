import { getCyprusDateString, isReservationTimeAvailable } from "@/lib/openingHours";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[\d\s().-]+$/;

function isValidTimeFormat(value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  if (minutes !== 0 && minutes !== 30) return false;
  return hours >= 0 && hours <= 23;
}

export function validateReservationInput(input, options = {}) {
  const errors = {};
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input?.phone === "string" ? input.phone.trim() : "";
  const date = typeof input?.date === "string" ? input.date.trim() : "";
  const time = typeof input?.time === "string" ? input.time.trim() : "";
  const partySize = Number(input?.guests);
  const requests = typeof input?.requests === "string" ? input.requests.trim() : "";
  const phoneDigits = phone.replace(/\D/g, "");

  if (name.length < 2 || name.length > 100) errors.name = "Name must be between 2 and 100 characters.";
  if (!emailPattern.test(email) || email.length > 254) errors.email = "Enter a valid email address.";
  if (!phonePattern.test(phone) || phone.length > 30 || phoneDigits.length < 6 || phoneDigits.length > 15) {
    errors.phone = "Enter a valid phone number using 6 to 15 digits.";
  }
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 20) errors.guests = "Party size must be between 1 and 20.";

  const today = getCyprusDateString();
  const maxDate = new Date(`${today}T12:00:00.000Z`);
  maxDate.setUTCDate(maxDate.getUTCDate() + 180);
  const maxDateString = maxDate.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00.000Z`)) || date < today || date > maxDateString) {
    errors.date = "Choose a date within the next 180 days.";
  }
  if (!isValidTimeFormat(time)) {
    errors.time = "Choose a valid reservation time.";
  } else if (options.openingHours && !isReservationTimeAvailable(options.openingHours, date, time)) {
    errors.time = "The restaurant is closed at the selected time.";
  }
  if (requests.length > 1000) errors.requests = "Special requests must be 1000 characters or fewer.";

  return {
    data: {
      customerName: name,
      email,
      phone,
      partySize,
      date: new Date(`${date}T12:00:00.000Z`),
      time,
      requests: requests || null,
    },
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}
