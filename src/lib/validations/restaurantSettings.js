import { WEEK_DAYS } from "@/lib/openingHours"
import { getStorefrontNoticeDestinationByHref } from "@/lib/storefrontNoticeDestinations"

const EFFECTS = ["NONE", "LUNAR_NEW_YEAR", "CHRISTMAS", "NEW_YEAR", "VALENTINE", "SUMMER"]
const NOTICE_TYPES = ["GENERAL", "PROMOTION", "TEMPORARY_CLOSURE", "HOLIDAY"]
const NOTICE_PRIORITIES = ["LOW", "NORMAL", "IMPORTANT", "URGENT"]
const INTENSITIES = ["Low", "Medium", "High"]
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function text(value, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : ""
}

function optionalUrl(value) {
  const url = text(value, 1000)
  if (!url) return ""
  try {
    const parsed = new URL(url)
    return ["http:", "https:"].includes(parsed.protocol) ? url : null
  } catch {
    return null
  }
}

function optionalDate(value) {
  const date = text(value, 10)
  if (!date) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00.000Z`)) ? date : undefined
}

function moneyCents(value) {
  if (typeof value !== "string" && typeof value !== "number") return null
  const normalized = String(value).trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const cents = Math.round(Number(normalized) * 100)
  return Number.isSafeInteger(cents) ? cents : null
}

function decimalNumber(value, minimum, maximum) {
  if (typeof value !== "string" && typeof value !== "number") return null
  const normalized = String(value).trim().replace(",", ".")
  if (!/^-?\d+(?:\.\d{1,7})?$/.test(normalized)) return null
  const number = Number(normalized)
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null
}

export function validateRestaurantSettings(body) {
  const errors = {}
  const profile = body?.profile || {}
  const storefront = body?.storefront || {}
  const notice = body?.notice || {}
  const openingHours = Array.isArray(body?.openingHours) ? body.openingHours : null

  const email = text(profile.email, 254).toLowerCase()
  const phoneEntries = Array.isArray(profile.phones) ? profile.phones : null
  const phones = (phoneEntries || []).map((value) => text(value, 30)).filter(Boolean)
  const address = text(profile.address, 300)
  const mapUrl = optionalUrl(profile.mapUrl)

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address."
  if (!phoneEntries || !phones.length) errors.phones = "Enter at least one phone number."
  if (phones.length > 10) errors.phones = "Phone numbers can contain at most 10 rows."
  if (phones.some((phone) => phone.length < 3 || !/^\+?[\d\s().-]+$/.test(phone))) errors.phones = "Enter valid phone numbers."
  if (new Set(phones.map((phone) => phone.replace(/\D/g, ""))).size !== phones.length) errors.phones = "Remove duplicate phone numbers."
  if (address.length < 3) errors.address = "Enter the restaurant address."
  if (mapUrl === null) errors.mapUrl = "Map URL must start with http:// or https://."
  if (!openingHours) errors.openingHours = "Opening hours must be a list."
  if (openingHours && openingHours.length !== WEEK_DAYS.length) errors.openingHours = "Opening hours must contain all seven days of the week."

  const seenOpeningDays = new Set()
  const normalizedHours = (openingHours || []).map((entry, index) => {
    const day = text(entry?.day, 50)
    const openTime = text(entry?.openTime, 5)
    const closeTime = text(entry?.closeTime, 5)
    const isClosed = Boolean(entry?.isClosed)
    if (!WEEK_DAYS.includes(day)) {
      errors[`openingHours.${index}.day`] = `Row ${index + 1}: select a valid weekday.`
    } else if (seenOpeningDays.has(day)) {
      errors[`openingHours.${index}.day`] = `Row ${index + 1}: ${day} has already been added.`
    } else {
      seenOpeningDays.add(day)
    }
    if (!isClosed && (!TIME_PATTERN.test(openTime) || !TIME_PATTERN.test(closeTime))) {
      errors[`openingHours.${index}.time`] = `Row ${index + 1}: enter valid opening and closing times.`
    } else if (!isClosed && openTime >= closeTime) {
      errors[`openingHours.${index}.time`] = `Row ${index + 1}: closing time must be later than opening time.`
    }
    return { day, openTime, closeTime, isClosed, sortOrder: WEEK_DAYS.indexOf(day) }
  }).sort((left, right) => left.sortOrder - right.sortOrder)

  if (WEEK_DAYS.some((day) => !seenOpeningDays.has(day))) errors.openingHours = "Opening hours must include each weekday exactly once."

  const festivalEffect = text(storefront.festivalEffect, 30).toUpperCase()
  const effectIntensity = text(storefront.effectIntensity, 20)
  const effectStartsAt = optionalDate(storefront.startsAt)
  const effectEndsAt = optionalDate(storefront.endsAt)
  const nearbyDeliveryFeeCents = moneyCents(storefront.nearbyDeliveryFee)
  const fartherDeliveryFeeCents = moneyCents(storefront.fartherDeliveryFee)
  const restaurantLatitude = decimalNumber(storefront.restaurantLatitude, 34.4, 35.8)
  const restaurantLongitude = decimalNumber(storefront.restaurantLongitude, 32, 34.8)
  const nearbyDeliveryMaxKm = decimalNumber(storefront.nearbyDeliveryMaxKm, 0.1, 100)
  const maximumDeliveryKm = decimalNumber(storefront.maximumDeliveryKm, 0.1, 100)
  const noticeType = text(notice.type, 30).toUpperCase()
  const noticePriority = text(notice.priority, 30).toUpperCase()
  const noticeTitle = text(notice.title, 160)
  const noticeMessage = text(notice.message, 1200)
  const ctaLabel = text(notice.ctaLabel, 80)
  const ctaHref = text(notice.ctaHref, 500)
  const ctaDestination = getStorefrontNoticeDestinationByHref(ctaHref)
  const ctaEnabled = Boolean(notice.ctaEnabled)
  const startsAt = optionalDate(notice.startsAt)
  const endsAt = optionalDate(notice.endsAt)

  if (!EFFECTS.includes(festivalEffect)) errors.festivalEffect = "Invalid festival effect."
  if (!INTENSITIES.includes(effectIntensity)) errors.effectIntensity = "Invalid effect intensity."
  if (effectStartsAt === undefined || effectEndsAt === undefined) errors.effectDates = "Festival effect dates are invalid."
  if (effectStartsAt && effectEndsAt && effectStartsAt > effectEndsAt) errors.effectDates = "Festival effect end date must be on or after its start date."
  if (nearbyDeliveryFeeCents === null || nearbyDeliveryFeeCents < 1 || nearbyDeliveryFeeCents > 10000) errors.nearbyDeliveryFee = "Nearby delivery fee must be between €0.01 and €100.00."
  if (fartherDeliveryFeeCents === null || fartherDeliveryFeeCents < 1 || fartherDeliveryFeeCents > 10000) errors.fartherDeliveryFee = "Farther delivery fee must be between €0.01 and €100.00."
  if (nearbyDeliveryFeeCents !== null && fartherDeliveryFeeCents !== null && fartherDeliveryFeeCents < nearbyDeliveryFeeCents) errors.fartherDeliveryFee = "Farther delivery fee cannot be lower than the nearby fee."
  if (restaurantLatitude === null || restaurantLongitude === null) errors.restaurantLocation = "Set the restaurant location on the map."
  if (nearbyDeliveryMaxKm === null) errors.nearbyDeliveryMaxKm = "Nearby distance must be between 0.1 and 100 km."
  if (maximumDeliveryKm === null) errors.maximumDeliveryKm = "Maximum delivery distance must be between 0.1 and 100 km."
  if (nearbyDeliveryMaxKm !== null && maximumDeliveryKm !== null && maximumDeliveryKm <= nearbyDeliveryMaxKm) errors.maximumDeliveryKm = "Maximum delivery distance must be greater than the nearby distance."
  if (!NOTICE_TYPES.includes(noticeType)) errors.noticeType = "Invalid notice type."
  if (!NOTICE_PRIORITIES.includes(noticePriority)) errors.noticePriority = "Invalid notice priority."
  if (Boolean(notice.enabled) && noticeTitle.length < 2) errors.noticeTitle = "Notice title is required when enabled."
  if (Boolean(notice.enabled) && noticeMessage.length < 2) errors.noticeMessage = "Notice message is required when enabled."
  if (ctaEnabled && (!ctaDestination || ctaDestination.label !== ctaLabel)) errors.noticeCta = "Select a valid action button destination."
  if (startsAt === undefined || endsAt === undefined) errors.noticeDates = "Notice dates are invalid."
  if (startsAt && endsAt && startsAt > endsAt) errors.noticeDates = "Notice end date must be on or after its start date."

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      profile: { email: email || null, phone: phones.join(" / "), address, mapUrl: mapUrl || null },
      openingHours: normalizedHours,
      storefront: {
        festivalEffectEnabled: Boolean(storefront.festivalEffectEnabled),
        festivalEffect,
        effectIntensity,
        effectStartsAt: effectStartsAt ? new Date(`${effectStartsAt}T00:00:00.000Z`) : null,
        effectEndsAt: effectEndsAt ? new Date(`${effectEndsAt}T23:59:59.999Z`) : null,
        nearbyDeliveryFee: (nearbyDeliveryFeeCents / 100).toFixed(2),
        fartherDeliveryFee: (fartherDeliveryFeeCents / 100).toFixed(2),
        restaurantLatitude,
        restaurantLongitude,
        nearbyDeliveryMaxKm: nearbyDeliveryMaxKm?.toFixed(2),
        maximumDeliveryKm: maximumDeliveryKm?.toFixed(2),
      },
      notice: {
        enabled: Boolean(notice.enabled),
        type: noticeType,
        priority: noticePriority,
        title: noticeTitle || "Restaurant notice",
        message: noticeMessage || "Restaurant update.",
        ctaEnabled,
        ctaLabel: ctaEnabled ? ctaDestination?.label || null : null,
        ctaHref: ctaEnabled ? ctaDestination?.href || null : null,
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00.000Z`) : null,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59.999Z`) : null,
      },
    },
  }
}
