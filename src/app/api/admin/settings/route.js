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
  { day: "Monday - Friday", openTime: "11:00", closeTime: "22:00", isClosed: false, sortOrder: 0 },
  { day: "Saturday", openTime: "11:00", closeTime: "23:00", isClosed: false, sortOrder: 1 },
  { day: "Sunday", openTime: "12:00", closeTime: "21:00", isClosed: false, sortOrder: 2 },
]

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

function serialize(profile, openingHours, storefront, notice) {
  return {
    profile: profile ? {
      name: profile.name,
      email: profile.email || "",
      phones: splitPhoneNumbers(profile.phone),
      address: profile.address || "",
      mapUrl: profile.mapUrl || "",
    } : { ...DEFAULT_PROFILE, phones: splitPhoneNumbers(DEFAULT_PROFILE.phone) },
    openingHours: openingHours.length ? openingHours.map((entry) => ({
      id: entry.id,
      day: entry.day,
      ...splitHours(entry.hours),
      isClosed: entry.isClosed,
    })) : DEFAULT_HOURS,
    storefront: {
      festivalEffectEnabled: storefront?.festivalEffectEnabled || false,
      festivalEffect: storefront?.festivalEffect || "NONE",
      effectIntensity: storefront?.effectIntensity || "Medium",
      startsAt: dateValue(storefront?.effectStartsAt),
      endsAt: dateValue(storefront?.effectEndsAt),
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

export async function GET() {
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
