import { authorizeAdminRequest } from "@/lib/adminApiAuth"
import { getOpeningHoursForDate, WEEK_DAYS } from "@/lib/openingHours"
import { prisma } from "@/lib/prisma"
import { validateRestaurantSettings } from "@/lib/validations/restaurantSettings"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_PROFILE = {
  name: "Hoa Phuong Do",
  email: "hoangbao130919@gmail.com",
  phone: "+357 26652228 / +357 99856636",
  address: "Leoforos Chrysoneras, Z9 Efstathios Plaza, 8574 Kissonerga",
  mapUrl: "https://maps.google.com",
}

const DEFAULT_HOURS = [
  { day: "Monday", openTime: "11:00", closeTime: "22:00", isClosed: false, sortOrder: 0 },
  { day: "Tuesday", openTime: "11:00", closeTime: "22:00", isClosed: false, sortOrder: 1 },
  { day: "Wednesday", openTime: "11:00", closeTime: "22:00", isClosed: false, sortOrder: 2 },
  { day: "Thursday", openTime: "11:00", closeTime: "22:00", isClosed: false, sortOrder: 3 },
  { day: "Friday", openTime: "11:00", closeTime: "22:00", isClosed: false, sortOrder: 4 },
  { day: "Saturday", openTime: "11:00", closeTime: "23:00", isClosed: false, sortOrder: 5 },
  { day: "Sunday", openTime: "12:00", closeTime: "21:00", isClosed: false, sortOrder: 6 },
]

const WEEK_DAY_DATES = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07"]

function splitHours(hours) {
  const match = typeof hours === "string" ? hours.match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/) : null
  return { openTime: match?.[1] || "11:00", closeTime: match?.[2] || "22:00" }
}

function splitPhoneNumbers(phone) {
  return String(phone || "").split("/").map((value) => value.trim()).filter(Boolean)
}

function dateValue(value) {
  return value ? value.toISOString().slice(0, 10) : ""
}

function serializeOpeningHours(openingHours) {
  if (!openingHours.length) return DEFAULT_HOURS

  return WEEK_DAYS.map((day, index) => {
    const entry = getOpeningHoursForDate(openingHours, WEEK_DAY_DATES[index])
    const fallback = DEFAULT_HOURS[index]
    if (!entry) return fallback
    return {
      id: String(entry.day).toLowerCase() === day.toLowerCase() ? entry.id : undefined,
      day,
      ...splitHours(entry.hours),
      isClosed: entry.isClosed,
    }
  })
}

function serialize(profile, openingHours, storefront, notice) {
  return {
    profile: profile ? {
      name: profile.name,
      email: profile.email || "",
      phones: splitPhoneNumbers(profile.phone),
      address: profile.address || "",
      mapUrl: profile.mapUrl || "",
    } : { ...DEFAULT_PROFILE, phones: splitPhoneNumbers(DEFAULT_PROFILE.phone) },
    openingHours: serializeOpeningHours(openingHours),
    storefront: {
      festivalEffectEnabled: storefront?.festivalEffectEnabled || false,
      festivalEffect: storefront?.festivalEffect || "NONE",
      effectIntensity: storefront?.effectIntensity || "Medium",
      startsAt: dateValue(storefront?.effectStartsAt),
      endsAt: dateValue(storefront?.effectEndsAt),
      nearbyDeliveryFee: Number(storefront?.nearbyDeliveryFee ?? 3).toFixed(2),
      fartherDeliveryFee: Number(storefront?.fartherDeliveryFee ?? 3.5).toFixed(2),
      restaurantLatitude: storefront?.restaurantLatitude === null || storefront?.restaurantLatitude === undefined ? "" : Number(storefront.restaurantLatitude).toFixed(7),
      restaurantLongitude: storefront?.restaurantLongitude === null || storefront?.restaurantLongitude === undefined ? "" : Number(storefront.restaurantLongitude).toFixed(7),
      nearbyDeliveryMaxKm: Number(storefront?.nearbyDeliveryMaxKm ?? 5).toFixed(2),
      maximumDeliveryKm: Number(storefront?.maximumDeliveryKm ?? 15).toFixed(2),
    },
    notice: {
      enabled: notice?.enabled || false,
      type: notice?.type || "GENERAL",
      priority: notice?.priority || "NORMAL",
      title: notice?.title || "Restaurant notice",
      message: notice?.message || "A short update for our guests.",
      ctaEnabled: notice?.ctaEnabled || false,
      ctaLabel: notice?.ctaLabel || "",
      ctaHref: notice?.ctaHref || "",
      startsAt: dateValue(notice?.startsAt),
      endsAt: dateValue(notice?.endsAt),
    },
  }
}

export async function GET(request) {
  const auth = await authorizeAdminRequest(request)
  if (auth.response) return auth.response
  try {
    const [profile, openingHours, storefront, notice] = await prisma.$transaction([
      prisma.restaurantProfile.findUnique({ where: { id: "default" } }),
      prisma.openingHour.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
      prisma.storefrontSettings.findUnique({ where: { id: "default" } }),
      prisma.storefrontNotice.findUnique({ where: { id: "default" } }),
    ])
    return Response.json({ data: serialize(profile, openingHours, storefront, notice) }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("GET /api/admin/settings", error)
    return Response.json({ error: "Failed to load settings." }, { status: 500 })
  }
}

export async function PUT(request) {
  const auth = await authorizeAdminRequest(request)
  if (auth.response) return auth.response
  let body
  try { body = await request.json() } catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }) }
  const validation = validateRestaurantSettings(body)
  if (!validation.isValid) return Response.json({ errors: validation.errors }, { status: 422 })

  const { profile, openingHours, storefront, notice } = validation.data
  try {
    const result = await prisma.$transaction(async (tx) => {
      const savedProfile = await tx.restaurantProfile.upsert({ where: { id: "default" }, create: { id: "default", name: "Hoa Phuong Do", ...profile }, update: profile })
      const savedStorefront = await tx.storefrontSettings.upsert({ where: { id: "default" }, create: { id: "default", ...storefront }, update: storefront })
      const savedNotice = await tx.storefrontNotice.upsert({ where: { id: "default" }, create: { id: "default", ...notice }, update: notice })
      await tx.openingHour.deleteMany()
      if (openingHours.length) {
        await tx.openingHour.createMany({ data: openingHours.map((entry) => ({ day: entry.day, hours: entry.isClosed ? "Closed" : `${entry.openTime} - ${entry.closeTime}`, isClosed: entry.isClosed, sortOrder: entry.sortOrder })) })
      }
      const savedHours = await tx.openingHour.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })
      return serialize(savedProfile, savedHours, savedStorefront, savedNotice)
    })
    return Response.json({ data: result }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("PUT /api/admin/settings", error)
    return Response.json({ error: "Failed to save settings." }, { status: 500 })
  }
}
