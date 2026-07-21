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
  if (openingHours?.length > 21) errors.openingHours = "Opening hours can contain at most 21 rows."

  const normalizedHours = (openingHours || []).map((entry, index) => {
    const day = text(entry?.day, 50)
    const openTime = text(entry?.openTime, 5)
    const closeTime = text(entry?.closeTime, 5)
    const isClosed = Boolean(entry?.isClosed)
    if (!day) errors[`openingHours.${index}.day`] = `Row ${index + 1}: enter a day or label.`
    if (!isClosed && (!TIME_PATTERN.test(openTime) || !TIME_PATTERN.test(closeTime))) {
      errors[`openingHours.${index}.time`] = `Row ${index + 1}: enter valid opening and closing times.`
    }
    return { day, openTime, closeTime, isClosed, sortOrder: index }
  })

  const festivalEffect = text(storefront.festivalEffect, 30).toUpperCase()
  const effectIntensity = text(storefront.effectIntensity, 20)
  const effectStartsAt = optionalDate(storefront.startsAt)
  const effectEndsAt = optionalDate(storefront.endsAt)
  const noticeType = text(notice.type, 30).toUpperCase()
  const noticePriority = text(notice.priority, 30).toUpperCase()
  const noticeTitle = text(notice.title, 160)
  const noticeMessage = text(notice.message, 1200)
  const ctaLabel = text(notice.ctaLabel, 80)
  const ctaHref = text(notice.ctaHref, 500)
  const startsAt = optionalDate(notice.startsAt)
  const endsAt = optionalDate(notice.endsAt)

  if (!EFFECTS.includes(festivalEffect)) errors.festivalEffect = "Invalid festival effect."
  if (!INTENSITIES.includes(effectIntensity)) errors.effectIntensity = "Invalid effect intensity."
  if (effectStartsAt === undefined || effectEndsAt === undefined) errors.effectDates = "Festival effect dates are invalid."
  if (effectStartsAt && effectEndsAt && effectStartsAt > effectEndsAt) errors.effectDates = "Festival effect end date must be on or after its start date."
  if (!NOTICE_TYPES.includes(noticeType)) errors.noticeType = "Invalid notice type."
  if (!NOTICE_PRIORITIES.includes(noticePriority)) errors.noticePriority = "Invalid notice priority."
  if (Boolean(notice.enabled) && noticeTitle.length < 2) errors.noticeTitle = "Notice title is required when enabled."
  if (Boolean(notice.enabled) && noticeMessage.length < 2) errors.noticeMessage = "Notice message is required when enabled."
  if (Boolean(notice.ctaEnabled) && (!ctaLabel || !ctaHref.startsWith("/"))) errors.noticeCta = "Action button requires a label and an internal link beginning with /."
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
      },
      notice: {
        enabled: Boolean(notice.enabled),
        type: noticeType,
        priority: noticePriority,
        title: noticeTitle || "Restaurant notice",
        message: noticeMessage || "Restaurant update.",
        ctaEnabled: Boolean(notice.ctaEnabled),
        ctaLabel: ctaLabel || null,
        ctaHref: ctaHref || null,
        startsAt: startsAt ? new Date(`${startsAt}T00:00:00.000Z`) : null,
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59.999Z`) : null,
      },
    },
  }
}
