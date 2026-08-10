const CYPRUS_TIME_ZONE = "Asia/Nicosia";

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CYPRUS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getCyprusDateKey(date = new Date()) {
  const parts = dateKeyFormatter.formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function shiftDateKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function timeZoneOffsetMs(date) {
  const value = new Intl.DateTimeFormat("en-US", {
    timeZone: CYPRUS_TIME_ZONE,
    timeZoneName: "shortOffset",
  }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value || "GMT";
  const match = value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] || 0);
  return (match[1] === "-" ? -minutes : minutes) * 60 * 1000;
}

export function cyprusMidnightUtc(key) {
  const [year, month, day] = key.split("-").map(Number);
  const wallClock = Date.UTC(year, month - 1, day);
  let result = new Date(wallClock);
  for (let index = 0; index < 2; index += 1) {
    result = new Date(wallClock - timeZoneOffsetMs(result));
  }
  return result;
}

export function getCyprusDayRange(date = new Date()) {
  const key = getCyprusDateKey(date);
  return {
    gte: cyprusMidnightUtc(key),
    lt: cyprusMidnightUtc(shiftDateKey(key, 1)),
  };
}
