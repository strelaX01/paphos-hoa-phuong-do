const DAY_INDEXES = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

export const WEEK_DAYS = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
])

function dayIndex(value) {
  return DAY_INDEXES[String(value || '').trim().toLowerCase().replace(/\./g, '')]
}

function dateDayIndex(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Date(`${date}T12:00:00.000Z`).getUTCDay()
  }
  return new Date(date).getDay()
}

function scheduleMatchScore(label, targetDay) {
  const normalized = String(label || '')
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\bto\b/g, '-')
    .replace(/\./g, '')
    .trim()

  if (['daily', 'every day', 'all week'].includes(normalized)) return 1
  if (normalized === 'weekdays') return targetDay >= 1 && targetDay <= 5 ? 1 : 0
  if (normalized === 'weekends') return targetDay === 0 || targetDay === 6 ? 1 : 0

  const parts = normalized.split(/\s*(?:,|\/|&|\band\b)\s*/).filter(Boolean)
  let bestScore = 0

  for (const part of parts) {
    const range = part.split(/\s*-\s*/)
    if (range.length === 2) {
      const start = dayIndex(range[0])
      const end = dayIndex(range[1])
      if (start === undefined || end === undefined) continue
      const matches = start <= end
        ? targetDay >= start && targetDay <= end
        : targetDay >= start || targetDay <= end
      if (matches) bestScore = Math.max(bestScore, 1)
      continue
    }

    if (dayIndex(part) === targetDay) bestScore = Math.max(bestScore, parts.length === 1 ? 3 : 2)
  }

  return bestScore
}

export function getOpeningHoursForDate(openingHours, date) {
  if (!date) return null
  const targetDay = dateDayIndex(date)

  return (openingHours || []).reduce((best, entry) => {
    const score = scheduleMatchScore(entry.day, targetDay)
    return score > best.score ? { entry, score } : best
  }, { entry: null, score: 0 }).entry
}

export function parseOpeningHoursRange(hours) {
  const match = String(hours || '').match(/^(\d{2}):(\d{2})\s*[-\u2013\u2014]\s*(\d{2}):(\d{2})$/)
  if (!match) return null

  const openMinutes = Number(match[1]) * 60 + Number(match[2])
  const closeMinutes = Number(match[3]) * 60 + Number(match[4])
  if (openMinutes >= closeMinutes) return null
  return { openMinutes, closeMinutes }
}

export function getReservationTimeSlots(openingHours, date, intervalMinutes = 30) {
  const schedule = getOpeningHoursForDate(openingHours, date)
  if (!schedule || schedule.isClosed) return []

  const range = parseOpeningHoursRange(schedule.hours)
  if (!range) return []

  const slots = []
  for (let minutes = range.openMinutes; minutes + intervalMinutes <= range.closeMinutes; minutes += intervalMinutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
    const mins = String(minutes % 60).padStart(2, '0')
    slots.push(`${hours}:${mins}`)
  }
  return slots
}

export function isReservationTimeAvailable(openingHours, date, time) {
  return getReservationTimeSlots(openingHours, date).includes(time)
}
