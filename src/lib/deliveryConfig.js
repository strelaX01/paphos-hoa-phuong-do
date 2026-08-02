import { getOpeningHoursForDate, parseOpeningHoursRange } from "@/lib/openingHours";

export const DELIVERY_CONFIG = Object.freeze({
  currency: "EUR",
  nearbyFeeCents: 300,
  fartherFeeCents: 350,
  maxDistinctItems: 30,
  maxItemQuantity: 20,
  maxTotalQuantity: 50,
});

export function buildDeliveryFeeConsentText(nearbyFeeCents, fartherFeeCents) {
  return `I understand and agree that the delivery fee is €${centsToMoney(nearbyFeeCents)} for nearby areas or €${centsToMoney(fartherFeeCents)} for farther areas. The restaurant will confirm the applicable fee based on my delivery address before fulfilment.`;
}

export function getDeliveryAvailability(openingHours, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Nicosia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type) => parts.find((part) => part.type === type)?.value || "";
  const date = `${read("year")}-${read("month")}-${read("day")}`;
  const schedule = getOpeningHoursForDate(openingHours, date);
  const range = schedule && !schedule.isClosed ? parseOpeningHoursRange(schedule.hours) : null;
  const currentMinutes = Number(read("hour")) * 60 + Number(read("minute"));
  const isOpen = Boolean(range && currentMinutes >= range.openMinutes && currentMinutes < range.closeMinutes);
  const [opensAt, closesAt] = range ? schedule.hours.split(/\s*[-\u2013\u2014]\s*/) : [null, null];

  return {
    isOpen,
    isClosedDay: !schedule || schedule.isClosed || !range,
    opensAt,
    closesAt,
    timeZone: "Asia/Nicosia",
  };
}

export function centsToMoney(cents) {
  return (cents / 100).toFixed(2);
}
